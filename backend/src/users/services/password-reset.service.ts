import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { AccountTokenType, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PasswordHashingService } from '../../auth/password-hashing.service';
import { SessionUserStatusService } from '../../auth/session-user-status.service';
import { EmailService } from '../../common/email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityRateLimitStorage } from '../../security/security-rate-limit.storage';

const RESET_PASSWORD_TOKEN_EXPIRES_MS = 30 * 60 * 1000;
const ADMIN_RESET_ROLES = ['ADMIN', 'EDITOR'] as const;
const INVALID_LINK_MESSAGE = 'El enlace no es valido o ha expirado.';
/** Links that set a password: once one is used, the others of the same user stop working. */
const PASSWORD_TOKEN_TYPES = [AccountTokenType.PASSWORD_RESET, AccountTokenType.SET_PASSWORD];

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService = undefined as never,
    private readonly emailService: EmailService = undefined as never,
    private readonly passwordHashing: PasswordHashingService = new PasswordHashingService(),
    private readonly accountRateLimit: SecurityRateLimitStorage = new SecurityRateLimitStorage(
      prisma,
    ),
    @Optional() private readonly sessionStatus?: SessionUserStatusService,
  ) {}

  async createAccountToken(userId: string, type: AccountTokenType) {
    const plainToken = randomBytes(32).toString('hex');
    await this.prisma.accountToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hashToken(plainToken),
        expiresAt: new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRES_MS),
      },
    });
    return plainToken;
  }

  async forgotPassword(email: string, flow: 'client' | 'admin' = 'client') {
    const normalizedEmail = this.sanitizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    const genericResponse = {
      message: 'Si el correo esta registrado, recibiras las instrucciones de recuperacion.',
    };
    try {
      await this.accountRateLimit.consume(
        `password-recovery:${normalizedEmail}`,
        3,
        60 * 60 * 1000,
      );
    } catch (error) {
      if (user && error instanceof HttpException && error.getStatus() === 429) {
        await this.createLog(
          user.id,
          'PASSWORD_RESET_LIMITED',
          'Solicitud de recuperacion limitada.',
        );
      }
      throw error;
    }
    if (!user || !this.canUsePasswordResetFlow(user.role, flow)) {
      return genericResponse;
    }

    const token = await this.createAccountToken(user.id, AccountTokenType.PASSWORD_RESET);
    try {
      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink: `${this.getFrontendUrl(flow)}${this.getResetPasswordPath(flow)}?token=${token}`,
        flow,
      });
    } catch (error) {
      // Same answer as for an unknown email: a 503 here would reveal that the account exists.
      console.warn('[AUTH] No se pudo enviar el correo de recuperacion', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
      await this.createLog(
        user.id,
        'PASSWORD_RESET_EMAIL_FAILED',
        'No se pudo enviar el correo de recuperacion.',
      );
      return genericResponse;
    }
    await this.createLog(
      user.id,
      'PASSWORD_RESET_REQUESTED',
      'Solicitud de recuperacion recibida.',
    );
    return genericResponse;
  }

  /**
   * New verification link for a customer whose first email failed or expired. The answer never
   * says whether the email is registered or already verified.
   */
  async resendEmailVerification(email: string) {
    const normalizedEmail = this.sanitizeEmail(email);
    const genericResponse = {
      message: 'Si la cuenta existe y no esta verificada, enviaremos un nuevo enlace.',
    };
    await this.accountRateLimit.consume(`email-verification:${normalizedEmail}`, 3, 60 * 60 * 1000);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.role !== 'CUSTOMER' || user.status !== 'ACTIVE' || user.emailVerified) {
      return genericResponse;
    }
    // Only the newest link stays valid.
    await this.prisma.accountToken.updateMany({
      where: { userId: user.id, type: AccountTokenType.EMAIL_VERIFICATION, usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = await this.createAccountToken(user.id, AccountTokenType.EMAIL_VERIFICATION);
    try {
      await this.emailService.sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        link: `${this.getClientFrontendUrl()}/auth/verify-email?token=${token}`,
      });
      await this.createLog(
        user.id,
        'EMAIL_VERIFICATION_RESENT',
        'Enlace de verificacion reenviado.',
      );
    } catch (error) {
      console.warn('[AUTH] No se pudo reenviar el correo de verificacion', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string, flow?: 'client' | 'admin') {
    // Every check runs before the link is spent: a typo in the new password keeps it usable.
    const accountToken = await this.findValidAccountToken(token, AccountTokenType.PASSWORD_RESET);
    const user = accountToken.user;
    if (flow && !this.canUsePasswordResetFlow(user.role, flow)) {
      throw new BadRequestException('El enlace de recuperacion no es valido o ha expirado.');
    }
    const administrative = ADMIN_RESET_ROLES.includes(
      user.role as (typeof ADMIN_RESET_ROLES)[number],
    );
    this.passwordHashing.assertPasswordPolicy(newPassword, administrative);
    const wasRestricted =
      user.failedLoginAttempts > 0 || Boolean(user.lockedUntil || user.failedLoginWindowStartedAt);
    const password = await this.passwordHashing.hashPassword(newPassword);
    await this.consumeTokenAndSetPassword(accountToken.id, user.id, {
      password,
      resetToken: null,
      resetTokenExpiry: null,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
      lastFailedLoginAt: null,
    });
    await this.createLog(user.id, 'UPDATE', 'Actualizacion de contrasena completada.');
    if (wasRestricted) {
      await this.createLog(
        user.id,
        'ADMIN_ACCOUNT_UNLOCKED',
        'Restriccion eliminada por restablecimiento de contrasena.',
      );
    }
    return { message: 'Contrasena actualizada correctamente' };
  }

  async setCustomerPassword(token: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Las contrasenas no coinciden.');
    }
    const accountToken = await this.findValidAccountToken(token, AccountTokenType.SET_PASSWORD);
    if (accountToken.user.role !== 'CUSTOMER') {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }
    this.passwordHashing.assertPasswordPolicy(password);
    await this.consumeTokenAndSetPassword(accountToken.id, accountToken.user.id, {
      password: await this.passwordHashing.hashPassword(password),
    });
    return { message: 'Contrasena creada correctamente' };
  }

  async verifyEmail(token: string) {
    const accountToken = await this.findValidAccountToken(
      token,
      AccountTokenType.EMAIL_VERIFICATION,
    );
    if (accountToken.user.role !== 'CUSTOMER') {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }
    await this.prisma.$transaction(async (tx) => {
      await this.claimAccountToken(tx, accountToken.id);
      await tx.user.update({
        where: { id: accountToken.user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });
    });
    return { message: 'Correo verificado correctamente' };
  }

  getClientFrontendUrl() {
    return this.getRequiredFrontendUrl(process.env.FRONTEND_URL);
  }

  /** The unused, unexpired link of ``type``; reading it never spends it. */
  private async findValidAccountToken(token: string, type: AccountTokenType) {
    const accountToken = await this.prisma.accountToken.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!accountToken) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }
    return accountToken;
  }

  /**
   * Spend a link exactly once: the conditional update only matches while ``usedAt`` is null,
   * so a second request with the same link (in parallel or later) gets no row and fails.
   */
  private async claimAccountToken(tx: Prisma.TransactionClient, accountTokenId: string) {
    const claimed = await tx.accountToken.updateMany({
      where: { id: accountTokenId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }
  }

  /**
   * Spend the link, store the new password and revoke what the old password protected: the
   * user's other password links and every session issued before now (passwordChangedAt).
   */
  private async consumeTokenAndSetPassword(
    accountTokenId: string,
    userId: string,
    data: Prisma.UserUpdateInput,
  ) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.claimAccountToken(tx, accountTokenId);
      await tx.user.update({ where: { id: userId }, data: { ...data, passwordChangedAt: now } });
      await tx.accountToken.updateMany({
        where: { userId, type: { in: PASSWORD_TOKEN_TYPES }, usedAt: null },
        data: { usedAt: now },
      });
    });
    this.sessionStatus?.invalidate(userId);
  }

  private getFrontendUrl(flow: 'client' | 'admin') {
    return flow === 'admin'
      ? this.getRequiredFrontendUrl(process.env.ADMIN_FRONTEND_URL || process.env.FRONTEND_URL)
      : this.getRequiredFrontendUrl(process.env.FRONTEND_URL);
  }
  private getRequiredFrontendUrl(value: string | undefined) {
    const url = value?.trim().replace(/\/$/, '') || '';
    if (!url) {
      throw new InternalServerErrorException('FRONTEND_URL no esta configurado en el backend.');
    }
    return url;
  }
  private getResetPasswordPath(flow: 'client' | 'admin') {
    return flow === 'admin'
      ? process.env.ADMIN_RESET_PASSWORD_PATH?.trim() || '/admin/reset-password'
      : process.env.CLIENT_RESET_PASSWORD_PATH?.trim() || '/auth/reset-password';
  }
  private canUsePasswordResetFlow(role: string, flow: 'client' | 'admin') {
    return flow === 'client'
      ? role === 'CUSTOMER'
      : ADMIN_RESET_ROLES.includes(role as (typeof ADMIN_RESET_ROLES)[number]);
  }
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private sanitizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
  private async createLog(userId: string, action: string, details: string) {
    try {
      await this.prisma.actionLog.create({
        data: { userId, action, entity: 'USER', entityType: 'USER', entityId: userId, details },
      });
    } catch (error) {
      console.warn('[SECURITY_AUDIT] No se pudo registrar evento de recuperacion', {
        action,
        userId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
}
