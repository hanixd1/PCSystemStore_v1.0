import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import { PasswordHashingService } from '../../auth/password-hashing.service';
import { AdminLoginProtectionService } from '../../auth/admin-login-protection.service';
import { EmailService } from '../../common/email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityRateLimitStorage } from '../../security/security-rate-limit.storage';
import { RegisterUserDto } from '../dto/register-user.dto';
import { PasswordResetService } from './password-reset.service';
import { UserSessionService } from './user-session.service';

const GOOGLE_OAUTH_STATE_EXPIRES_MS = 5 * 60 * 1000;
const ADMIN_LOGIN_PUBLIC_MESSAGE = 'Credenciales invalidas o acceso temporalmente restringido.';
const GOOGLE_OAUTH_MODES = ['login', 'register'] as const;
type GoogleOAuthMode = (typeof GOOGLE_OAUTH_MODES)[number];
type GoogleOAuthStatePayload = {
  state: string;
  codeVerifier: string;
  mode: GoogleOAuthMode;
  createdAt: number;
};

@Injectable()
export class UserAuthService {
  constructor(
    private readonly prisma: PrismaService = undefined as never,
    private readonly session: UserSessionService = undefined as never,
    private readonly emailService: EmailService = undefined as never,
    private readonly passwordReset: PasswordResetService = undefined as never,
    private readonly passwordHashing: PasswordHashingService = new PasswordHashingService(),
    private readonly adminProtection: AdminLoginProtectionService = new AdminLoginProtectionService(
      prisma,
    ),
    private readonly customerLoginProtection: SecurityRateLimitStorage = new SecurityRateLimitStorage(
      prisma,
    ),
  ) {}

  async customerLogin(email: string, pass: string, request?: Request) {
    const normalizedEmail = this.sanitizeEmail(email);
    const ip = this.getRequestIp(request) || 'unknown';
    const existingLimit = await this.customerLoginProtection.assertCustomerLoginAllowed(
      normalizedEmail,
      ip,
    );
    if (existingLimit.blocked) {
      await this.logBlockedCustomerAttempt(normalizedEmail, request);
      throw this.customerLoginProtection.tooManyRequests(
        new Date(Date.now() + existingLimit.retryAfterSeconds * 1000),
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    const passwordValid = user
      ? await this.passwordHashing.verifyPassword(user.password, pass)
      : await this.passwordHashing.simulateVerification(pass).then(() => false);
    if (!user || !passwordValid || user.role !== 'CUSTOMER' || user.status !== 'ACTIVE') {
      const result = await this.customerLoginProtection.recordCustomerLoginFailure(
        normalizedEmail,
        ip,
      );
      if (user) {
        await this.logAuthEvent(
          'CUSTOMER_LOGIN_FAILED',
          user.id,
          'Credenciales de cliente rechazadas.',
          request,
        );
        if (result.blocked) {
          await this.logAuthEvent(
            'CUSTOMER_LOGIN_BLOCKED',
            user.id,
            'Cuenta o direccion de origen limitada temporalmente.',
            request,
          );
        }
      }
      if (result.blocked) {
        throw this.customerLoginProtection.tooManyRequests(
          new Date(Date.now() + result.retryAfterSeconds * 1000),
        );
      }
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    await this.customerLoginProtection.resetCustomerLogin(normalizedEmail);
    if (this.passwordHashing.needsRehash(user.password)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: await this.passwordHashing.hashPassword(pass) },
      });
      await this.logAuthEvent(
        'PASSWORD_REHASHED',
        user.id,
        'Hash heredado actualizado a Argon2id.',
        request,
      );
    }
    await this.logAuthEvent(
      'CUSTOMER_LOGIN_SUCCESS',
      user.id,
      'Inicio de sesion cliente correcto.',
      request,
    );
    return this.session.buildSession(user);
  }

  async adminLogin(email: string, pass: string, request?: Request) {
    const normalizedEmail = this.sanitizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      await this.passwordHashing.simulateVerification(pass);
      throw new UnauthorizedException(ADMIN_LOGIN_PUBLIC_MESSAGE);
    }

    const passwordValid = await this.passwordHashing.verifyPassword(user.password, pass);
    if (this.adminProtection.isLocked(user)) {
      await this.logAuthEvent(
        'ADMIN_LOGIN_BLOCKED',
        user.id,
        'Intento de acceso durante restriccion temporal.',
        request,
      );
      throw new UnauthorizedException(ADMIN_LOGIN_PUBLIC_MESSAGE);
    }

    const administrative = ['ADMIN', 'EDITOR'].includes(user.role);
    if (!passwordValid || !administrative || user.status !== 'ACTIVE') {
      let locked = false;
      if (administrative) {
        const state = await this.adminProtection.registerFailure(user.id);
        locked = this.adminProtection.isLocked(state);
      }
      await this.logAuthEvent(
        'ADMIN_LOGIN_FAILED',
        user.id,
        'Credenciales administrativas rechazadas.',
        request,
      );
      if (locked) {
        await this.logAuthEvent(
          'ADMIN_LOGIN_BLOCKED',
          user.id,
          'Cuenta administrativa restringida temporalmente.',
          request,
        );
      }
      throw new UnauthorizedException(ADMIN_LOGIN_PUBLIC_MESSAGE);
    }

    const rehash = this.passwordHashing.needsRehash(user.password);
    const password = rehash ? await this.passwordHashing.hashPassword(pass) : undefined;
    const wasRestricted =
      user.failedLoginAttempts > 0 || Boolean(user.lockedUntil || user.failedLoginWindowStartedAt);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          failedLoginWindowStartedAt: null,
          lockedUntil: null,
          lastFailedLoginAt: null,
          lastSuccessfulLoginAt: new Date(),
          ...(password ? { password } : {}),
        },
      });
      const events = [
        ['ADMIN_LOGIN_SUCCESS', 'Inicio de sesion administrativo correcto.'],
        ['ADMIN_LOGIN', 'Inicio de sesion administrativo correcto.'],
        ...(wasRestricted
          ? [
              [
                'ADMIN_ACCOUNT_UNLOCKED',
                'Restriccion administrativa eliminada tras login correcto.',
              ],
            ]
          : []),
        ...(rehash ? [['PASSWORD_REHASHED', 'Hash heredado actualizado a Argon2id.']] : []),
      ];
      for (const [action, details] of events) {
        await transaction.actionLog.create({
          data: this.buildLogData(user.id, action, details, request),
        });
      }
    });
    return this.session.buildSession(user);
  }

  async recordLogout(userId: string, action: 'ADMIN_LOGOUT' | 'CUSTOMER_LOGOUT') {
    await this.createLog(userId, action, 'Cierre de sesion');
  }
  async hashPassword(password: string) {
    return this.passwordHashing.hashPassword(password);
  }
  assertAdministrativePassword(password: string) {
    this.passwordHashing.assertPasswordPolicy(password, true);
  }
  sanitizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async register(data: RegisterUserDto) {
    if (data.password !== data.confirmPassword) {
      throw new BadRequestException('Las contrasenas no coinciden.');
    }
    const email = this.sanitizeEmail(data.email);
    this.passwordHashing.assertPasswordPolicy(data.password);
    this.assertValidEmailFormat(email);
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Ese correo ya esta registrado');
    }
    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password: await this.hashPassword(data.password),
        role: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: false,
      },
    });
    const token = await this.passwordReset.createAccountToken(user.id, 'EMAIL_VERIFICATION');
    let verificationEmailSent = true;
    try {
      await this.emailService.sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        link: `${this.passwordReset.getClientFrontendUrl()}/auth/verify-email?token=${token}`,
      });
    } catch (error) {
      verificationEmailSent = false;
      console.warn('[AUTH] No se pudo enviar el correo de verificacion', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
    return {
      message: verificationEmailSent
        ? 'Cuenta creada correctamente. Revisa tu correo para verificar tu cuenta.'
        : 'La cuenta fue creada, pero no pudimos enviar el correo de verificacion. Intenta reenviarlo.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        profileComplete: false,
      },
    };
  }

  createGoogleOAuthUrl(mode: string) {
    if (!this.isGoogleOAuthMode(mode)) {
      throw new BadRequestException('Modo de autenticacion Google invalido.');
    }
    const state = randomBytes(32).toString('hex'),
      codeVerifier = this.toBase64Url(randomBytes(64)),
      redirectUri = this.getGoogleRedirectUri();
    const query = new URLSearchParams({
      client_id: this.getGoogleClientId(),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: this.toBase64Url(createHash('sha256').update(codeVerifier).digest()),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
      cookieValue: this.encodeGoogleOAuthStateCookie({
        state,
        codeVerifier,
        mode,
        createdAt: Date.now(),
      }),
    };
  }
  async handleGoogleOAuthCallback(code: string, state: string, stateCookie?: string) {
    if (!stateCookie?.trim()) {
      throw new UnauthorizedException('Estado de Google invalido o expirado.');
    }
    const stored = this.decodeGoogleOAuthStateCookie(stateCookie);
    if (stored.state !== state) {
      throw new UnauthorizedException('Estado de Google invalido.');
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.getGoogleClientId(),
        client_secret: this.getGoogleClientSecret(),
        code,
        code_verifier: stored.codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: this.getGoogleRedirectUri(),
      }),
    });
    const payload = (await response.json()) as { id_token?: string };
    if (!response.ok || !payload.id_token) {
      throw new UnauthorizedException('No se pudo completar la autenticacion con Google.');
    }
    return stored.mode === 'register'
      ? this.registerWithGoogle(payload.id_token)
      : this.loginWithGoogle(payload.id_token);
  }
  async loginWithGoogle(idToken: string) {
    const profile = await this.verifyGoogleIdToken(idToken),
      user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      throw new UnauthorizedException(
        'No existe una cuenta asociada a este Google. Crea una cuenta para continuar.',
      );
    }
    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Cuenta suspendida. Contacte al administrador.');
    }
    if (user.role !== 'CUSTOMER') {
      throw new UnauthorizedException(
        'Esta cuenta no puede iniciar sesion como cliente con Google',
      );
    }
    await this.createLog(user.id, 'LOGIN', `Inicio de sesion cliente con Google de ${user.email}`);
    return this.session.buildSession(user);
  }
  async registerWithGoogle(idToken: string) {
    const profile = await this.verifyGoogleIdToken(idToken);
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (user?.status === 'INACTIVE') {
      throw new UnauthorizedException('Cuenta suspendida. Contacte al administrador.');
    }
    if (user && user.role !== 'CUSTOMER') {
      throw new UnauthorizedException('Esta cuenta no puede registrarse como cliente con Google');
    }
    let createdUser = false;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          password: await this.hashPassword(`${profile.email}-${Date.now()}`),
          role: 'CUSTOMER',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      createdUser = true;
    }
    if (createdUser) {
      const token = await this.passwordReset.createAccountToken(user.id, 'SET_PASSWORD');
      try {
        await this.emailService.sendGoogleWelcomeSetPasswordEmail({
          to: user.email,
          name: user.name,
          link: `${this.passwordReset.getClientFrontendUrl()}/auth/set-password?token=${token}`,
        });
      } catch (error) {
        console.warn('[AUTH] No se pudo enviar el correo de bienvenida Google', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
    await this.createLog(
      user.id,
      createdUser ? 'REGISTER' : 'LOGIN',
      `${createdUser ? 'Registro' : 'Inicio de sesion'} cliente con Google de ${user.email}`,
    );
    return this.session.buildSession(user);
  }

  private async logBlockedCustomerAttempt(email: string, request?: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      await this.logAuthEvent(
        'CUSTOMER_LOGIN_BLOCKED_ATTEMPT',
        user.id,
        'Intento de inicio de sesion durante restriccion temporal.',
        request,
      );
    }
  }
  private async verifyGoogleIdToken(idToken: string) {
    if (!idToken?.trim()) {
      throw new BadRequestException('Token de Google requerido');
    }
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!response.ok) {
      throw new UnauthorizedException('No se pudo verificar la cuenta de Google');
    }
    const payload = (await response.json()) as {
      aud?: string;
      email?: string;
      email_verified?: string;
      name?: string;
    };
    if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException('El cliente de Google no coincide con la configuracion');
    }
    if (!payload.email || payload.email_verified !== 'true') {
      throw new UnauthorizedException('La cuenta de Google no tiene un correo verificado');
    }
    return {
      email: this.sanitizeEmail(payload.email),
      name: payload.name?.trim() || payload.email.split('@')[0],
    };
  }
  private getRequestIp(request?: Request) {
    return this.sanitizeLogValue(request?.ip || request?.socket?.remoteAddress, 64);
  }
  private async createLog(userId: string, action: string, details: string, request?: Request) {
    try {
      await this.prisma.actionLog.create({
        data: this.buildLogData(userId, action, details, request),
      });
    } catch (error) {
      // Auditing must not make authentication unavailable. Do not log request secrets.
      console.warn('[SECURITY_AUDIT] No se pudo registrar evento de autenticacion', {
        action,
        userId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
  private logAuthEvent(action: string, userId: string, details: string, request?: Request) {
    return this.createLog(userId, action, details, request);
  }
  private buildLogData(userId: string, action: string, details: string, request?: Request) {
    return {
      userId,
      action,
      entity: 'USER',
      module:
        action.startsWith('ADMIN_') || action === 'PASSWORD_REHASHED' ? 'SECURITY' : undefined,
      entityType: 'USER',
      entityId: userId,
      details: this.sanitizeLogValue(details, 500) || 'Evento de autenticacion.',
      ipAddress: this.getRequestIp(request),
      userAgent: this.sanitizeLogValue(request?.headers['user-agent'], 512),
    };
  }
  private sanitizeLogValue(value: string | undefined, maxLength: number) {
    const sanitized = Array.from(value ?? '')
      .filter((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint > 31 && codePoint !== 127;
      })
      .join('')
      .slice(0, maxLength);
    return sanitized || undefined;
  }
  private assertValidEmailFormat(email: string) {
    const at = email.indexOf('@');
    if (!email || email.includes(' ') || at <= 0 || at !== email.lastIndexOf('@')) {
      throw new BadRequestException('Ingresa un correo valido con dominio completo.');
    }
    const domain = email.slice(at + 1),
      dot = domain.lastIndexOf('.');
    if (dot <= 0 || domain.slice(dot + 1).length < 2) {
      throw new BadRequestException('Ingresa un correo valido con dominio completo.');
    }
  }
  private toBase64Url(value: Buffer | string) {
    const input = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
    return input.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }
  private getGoogleOAuthSecret() {
    const secret = process.env.JWT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!secret) {
      throw new InternalServerErrorException(
        'JWT_SECRET o GOOGLE_CLIENT_SECRET debe estar configurado para Google OAuth.',
      );
    }
    return secret;
  }
  private signGoogleOAuthPayload(value: string) {
    return this.toBase64Url(
      createHmac('sha256', this.getGoogleOAuthSecret()).update(value).digest(),
    );
  }
  private encodeGoogleOAuthStateCookie(payload: GoogleOAuthStatePayload) {
    const encoded = this.toBase64Url(JSON.stringify(payload));
    return `${encoded}.${this.signGoogleOAuthPayload(encoded)}`;
  }
  private decodeGoogleOAuthStateCookie(value: string): GoogleOAuthStatePayload {
    const [encoded, signature] = value.split('.');
    if (!encoded || !signature) {
      throw new UnauthorizedException('Estado de Google invalido o expirado.');
    }
    const expected = this.signGoogleOAuthPayload(encoded),
      receivedBuffer = Buffer.from(signature),
      expectedBuffer = Buffer.from(expected);
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Estado de Google invalido o expirado.');
    }
    let payload: Partial<GoogleOAuthStatePayload>;
    try {
      payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as Partial<GoogleOAuthStatePayload>;
    } catch {
      throw new UnauthorizedException('Estado de Google invalido o expirado.');
    }
    if (
      typeof payload.state !== 'string' ||
      typeof payload.codeVerifier !== 'string' ||
      !this.isGoogleOAuthMode(payload.mode) ||
      typeof payload.createdAt !== 'number'
    ) {
      throw new UnauthorizedException('Estado de Google invalido o expirado.');
    }
    if (Date.now() - payload.createdAt > GOOGLE_OAUTH_STATE_EXPIRES_MS) {
      throw new UnauthorizedException('Estado de Google expirado.');
    }
    return payload as GoogleOAuthStatePayload;
  }
  private isGoogleOAuthMode(mode: unknown): mode is GoogleOAuthMode {
    return GOOGLE_OAUTH_MODES.includes(mode as GoogleOAuthMode);
  }
  private getGoogleClientId() {
    const value = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!value) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_ID no esta configurado.');
    }
    return value;
  }
  private getGoogleClientSecret() {
    const value = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!value) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_SECRET no esta configurado.');
    }
    return value;
  }
  private getGoogleRedirectUri() {
    return (
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${this.passwordReset.getClientFrontendUrl()}/auth/google/callback`
    );
  }
}
