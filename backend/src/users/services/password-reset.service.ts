import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { AccountTokenType } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PasswordHashingService } from '../../auth/password-hashing.service';
import { EmailService } from '../../common/email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityRateLimitStorage } from '../../security/security-rate-limit.storage';

const RESET_PASSWORD_TOKEN_EXPIRES_MS = 30 * 60 * 1000;
const ADMIN_RESET_ROLES = ['ADMIN', 'EDITOR'] as const;

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService = undefined as never,
    private readonly emailService: EmailService = undefined as never,
    private readonly passwordHashing: PasswordHashingService = new PasswordHashingService(),
    private readonly accountRateLimit: SecurityRateLimitStorage = new SecurityRateLimitStorage(
      prisma,
    ),
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
    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink: `${this.getFrontendUrl(flow)}${this.getResetPasswordPath(flow)}?token=${token}`,
      flow,
    });
    await this.createLog(
      user.id,
      'PASSWORD_RESET_REQUESTED',
      'Solicitud de recuperacion recibida.',
    );
    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string, flow?: 'client' | 'admin') {
    const user = await this.consumeAccountToken(token, AccountTokenType.PASSWORD_RESET);
    if (flow && !this.canUsePasswordResetFlow(user.role, flow)) {
      throw new BadRequestException('El enlace de recuperacion no es valido o ha expirado.');
    }
    const administrative = ADMIN_RESET_ROLES.includes(
      user.role as (typeof ADMIN_RESET_ROLES)[number],
    );
    this.passwordHashing.assertPasswordPolicy(newPassword, administrative);
    const wasRestricted =
      user.failedLoginAttempts > 0 || Boolean(user.lockedUntil || user.failedLoginWindowStartedAt);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await this.passwordHashing.hashPassword(newPassword),
        resetToken: null,
        resetTokenExpiry: null,
        failedLoginAttempts: 0,
        failedLoginWindowStartedAt: null,
        lockedUntil: null,
        lastFailedLoginAt: null,
      },
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
    const user = await this.consumeAccountToken(token, AccountTokenType.SET_PASSWORD);
    if (user.role !== 'CUSTOMER') {
      throw new BadRequestException('El enlace no es valido o ha expirado.');
    }
    this.passwordHashing.assertPasswordPolicy(password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await this.passwordHashing.hashPassword(password) },
    });
    return { message: 'Contrasena creada correctamente' };
  }

  async verifyEmail(token: string) {
    const user = await this.consumeAccountToken(token, AccountTokenType.EMAIL_VERIFICATION);
    if (user.role !== 'CUSTOMER') {
      throw new BadRequestException('El enlace no es valido o ha expirado.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
    return { message: 'Correo verificado correctamente' };
  }

  getClientFrontendUrl() {
    return this.getRequiredFrontendUrl(process.env.FRONTEND_URL);
  }

  private async consumeAccountToken(token: string, type: AccountTokenType) {
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
      throw new BadRequestException('El enlace no es valido o ha expirado.');
    }
    await this.prisma.accountToken.update({
      where: { id: accountToken.id },
      data: { usedAt: new Date() },
    });
    return accountToken.user;
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
