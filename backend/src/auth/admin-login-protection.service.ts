import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPositiveInteger, SECURITY_DEFAULTS } from '../security/security.config';

export type LoginProtectionState = {
  failedLoginAttempts: number;
  failedLoginWindowStartedAt: Date | null;
  lockedUntil: Date | null;
  lastFailedLoginAt: Date | null;
};

@Injectable()
export class AdminLoginProtectionService {
  constructor(private readonly prisma: PrismaService = undefined as never) {}

  isLocked(state: Pick<LoginProtectionState, 'lockedUntil'>, now = new Date()): boolean {
    return Boolean(state.lockedUntil && state.lockedUntil.getTime() > now.getTime());
  }

  async registerFailure(userId: string, now = new Date()): Promise<LoginProtectionState> {
    const windowMs = this.windowMinutes * 60 * 1000;
    const lockUntil = new Date(now.getTime() + this.lockMinutes * 60 * 1000);
    const rows = await this.prisma.$queryRaw<LoginProtectionState[]>(Prisma.sql`
      UPDATE "User"
      SET
        "failedLoginAttempts" = CASE
          WHEN "failedLoginWindowStartedAt" IS NULL
            OR "failedLoginWindowStartedAt" <= ${new Date(now.getTime() - windowMs)}
          THEN 1
          ELSE "failedLoginAttempts" + 1
        END,
        "failedLoginWindowStartedAt" = CASE
          WHEN "failedLoginWindowStartedAt" IS NULL
            OR "failedLoginWindowStartedAt" <= ${new Date(now.getTime() - windowMs)}
          THEN ${now}
          ELSE "failedLoginWindowStartedAt"
        END,
        "lastFailedLoginAt" = ${now},
        "lockedUntil" = CASE
          WHEN (CASE
            WHEN "failedLoginWindowStartedAt" IS NULL
              OR "failedLoginWindowStartedAt" <= ${new Date(now.getTime() - windowMs)}
            THEN 1
            ELSE "failedLoginAttempts" + 1
          END) >= ${this.maxAttempts}
          THEN ${lockUntil}
          ELSE NULL
        END
      WHERE "id" = ${userId}
      RETURNING "failedLoginAttempts", "failedLoginWindowStartedAt", "lockedUntil", "lastFailedLoginAt"
    `);
    return (
      rows[0] ?? {
        failedLoginAttempts: 0,
        failedLoginWindowStartedAt: null,
        lockedUntil: null,
        lastFailedLoginAt: null,
      }
    );
  }

  async reset(userId: string, successful = false): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        failedLoginWindowStartedAt: null,
        lockedUntil: null,
        lastFailedLoginAt: null,
        ...(successful ? { lastSuccessfulLoginAt: new Date() } : {}),
      },
    });
  }

  private get maxAttempts(): number {
    return getPositiveInteger('ADMIN_LOGIN_MAX_ATTEMPTS', SECURITY_DEFAULTS.adminLoginMaxAttempts);
  }

  private get windowMinutes(): number {
    return getPositiveInteger(
      'ADMIN_LOGIN_WINDOW_MINUTES',
      SECURITY_DEFAULTS.adminLoginWindowMinutes,
    );
  }

  private get lockMinutes(): number {
    return getPositiveInteger('ADMIN_LOGIN_LOCK_MINUTES', SECURITY_DEFAULTS.adminLoginLockMinutes);
  }
}
