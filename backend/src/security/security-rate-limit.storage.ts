import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { createHmac } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPositiveInteger, SECURITY_DEFAULTS } from './security.config';

type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

type RateLimitRow = {
  key: string;
  hits: number;
  expiresAt: Date;
  blockedUntil: Date | null;
  penaltyLevel: number;
};

type RateLimitQueryClient = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Prisma.PrismaPromise<T>;
};

export type CustomerLoginLimitResult = {
  blocked: boolean;
  retryAfterSeconds: number;
  accountBlocked: boolean;
  ipBlocked: boolean;
};

/**
 * PostgreSQL-backed throttler storage. Every mutation is an UPSERT, so all
 * Railway replicas share state and concurrent requests serialize on the row.
 * The stored key is an HMAC, never a raw account identifier or IP address.
 */
@Injectable()
export class SecurityRateLimitStorage implements ThrottlerStorage {
  constructor(private readonly prisma: PrismaService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const row = await this.incrementFixedWindow(
      this.keyFor(`throttler:${throttlerName}`, key),
      ttl,
      limit,
      blockDuration || ttl,
    );
    const now = Date.now();
    return {
      totalHits: row.hits,
      timeToExpire: Math.max(0, row.expiresAt.getTime() - now),
      isBlocked: Boolean(row.blockedUntil && row.blockedUntil.getTime() > now),
      timeToBlockExpire: Math.max(0, (row.blockedUntil?.getTime() ?? now) - now),
    };
  }

  async consume(key: string, limit: number, ttl: number): Promise<void> {
    const row = await this.incrementFixedWindow(
      this.keyFor('account-rate-limit', key),
      ttl,
      limit,
      ttl,
    );
    if (row.blockedUntil && row.blockedUntil.getTime() > Date.now()) {
      throw this.tooManyRequests(row.blockedUntil);
    }
  }

  async assertCustomerLoginAllowed(email: string, ip: string): Promise<CustomerLoginLimitResult> {
    const [account, address] = await this.prisma.securityRateLimit.findMany({
      where: {
        key: {
          in: [this.keyFor('customer-login:account', email), this.keyFor('customer-login:ip', ip)],
        },
        blockedUntil: { gt: new Date() },
      },
      select: { key: true, blockedUntil: true },
    });
    const accountKey = this.keyFor('customer-login:account', email);
    const accountBlocked = account?.key === accountKey || address?.key === accountKey;
    const blockedRows = [account, address].filter(
      (row): row is { key: string; blockedUntil: Date | null } => Boolean(row?.blockedUntil),
    );
    const blockedUntil = blockedRows.reduce<Date | undefined>(
      (latest, row) =>
        !latest || (row.blockedUntil && row.blockedUntil > latest)
          ? (row.blockedUntil ?? latest)
          : latest,
      undefined,
    );
    return this.toCustomerResult(accountBlocked, Boolean(blockedUntil), blockedUntil);
  }

  async recordCustomerLoginFailure(email: string, ip: string): Promise<CustomerLoginLimitResult> {
    const accountKey = this.keyFor('customer-login:account', email);
    const ipKey = this.keyFor('customer-login:ip', ip);
    const [account, address] = await this.prisma.$transaction(async (transaction) => {
      const [accountRow] = await this.advanceCustomerLogin(
        accountKey,
        this.customerLoginMaxAttempts,
        transaction,
      );
      const [addressRow] = await this.incrementFixedWindowQuery(
        ipKey,
        this.customerLoginWindowMs,
        this.customerLoginIpMaxAttempts,
        this.customerLoginInitialLockMs,
        transaction,
      );
      return [accountRow, addressRow] as const;
    });
    const accountBlocked = Boolean(account?.blockedUntil && account.blockedUntil > new Date());
    const ipBlocked = Boolean(address?.blockedUntil && address.blockedUntil > new Date());
    const latest = [account.blockedUntil, address.blockedUntil]
      .filter((date): date is Date => Boolean(date))
      .sort((left, right) => right.getTime() - left.getTime())[0];
    return this.toCustomerResult(accountBlocked, ipBlocked, latest);
  }

  async resetCustomerLogin(email: string): Promise<void> {
    await this.prisma.securityRateLimit.deleteMany({
      where: { key: this.keyFor('customer-login:account', email) },
    });
  }

  /** Safe maintenance operation; invoke from a scheduled job or deployment task. */
  async pruneExpired(now = new Date()): Promise<number> {
    const result = await this.prisma.securityRateLimit.deleteMany({
      where: {
        expiresAt: { lt: now },
        OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
      },
    });
    return result.count;
  }

  private async incrementFixedWindow(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<RateLimitRow> {
    const [row] = await this.incrementFixedWindowQuery(key, ttl, limit, blockDuration);
    return row;
  }

  private incrementFixedWindowQuery(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    client: RateLimitQueryClient = this.prisma,
  ) {
    const ttlMs = Math.max(1, ttl);
    const blockMs = Math.max(1, blockDuration);
    return client.$queryRaw<RateLimitRow[]>(Prisma.sql`
      INSERT INTO "SecurityRateLimit" ("key", "hits", "expiresAt", "blockedUntil", "penaltyLevel", "createdAt", "updatedAt")
      VALUES (${key}, 1, CURRENT_TIMESTAMP + (${ttlMs} * INTERVAL '1 millisecond'), NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE
          WHEN "SecurityRateLimit"."blockedUntil" > CURRENT_TIMESTAMP THEN "SecurityRateLimit"."hits"
          WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE "SecurityRateLimit"."hits" + 1
        END,
        "expiresAt" = CASE
          WHEN "SecurityRateLimit"."blockedUntil" > CURRENT_TIMESTAMP THEN "SecurityRateLimit"."expiresAt"
          WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + (${ttlMs} * INTERVAL '1 millisecond')
          ELSE "SecurityRateLimit"."expiresAt"
        END,
        "blockedUntil" = CASE
          WHEN "SecurityRateLimit"."blockedUntil" > CURRENT_TIMESTAMP THEN "SecurityRateLimit"."blockedUntil"
          WHEN (CASE WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "SecurityRateLimit"."hits" + 1 END) > ${limit}
          THEN CURRENT_TIMESTAMP + (${blockMs} * INTERVAL '1 millisecond')
          ELSE NULL
        END,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "key", "hits", "expiresAt", "blockedUntil", "penaltyLevel"
    `);
  }

  private advanceCustomerLogin(
    key: string,
    maxAttempts: number,
    client: RateLimitQueryClient = this.prisma,
  ) {
    const windowMs = this.customerLoginWindowMs;
    const initialLockMs = this.customerLoginInitialLockMs;
    const escalatedLockMs = this.customerLoginEscalatedLockMs;
    return client.$queryRaw<RateLimitRow[]>(Prisma.sql`
      INSERT INTO "SecurityRateLimit" ("key", "hits", "expiresAt", "blockedUntil", "penaltyLevel", "createdAt", "updatedAt")
      VALUES (${key}, 1, CURRENT_TIMESTAMP + (${windowMs} * INTERVAL '1 millisecond'), NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE
          WHEN "SecurityRateLimit"."blockedUntil" > CURRENT_TIMESTAMP THEN "SecurityRateLimit"."hits"
          WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE "SecurityRateLimit"."hits" + 1
        END,
        "penaltyLevel" = CASE
          WHEN "SecurityRateLimit"."blockedUntil" > CURRENT_TIMESTAMP
            THEN "SecurityRateLimit"."penaltyLevel"
          WHEN (CASE
                  WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
                    AND "SecurityRateLimit"."penaltyLevel" = 2 THEN 0
                  ELSE "SecurityRateLimit"."penaltyLevel"
                END) = 0
            AND (CASE
                   WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
                   ELSE "SecurityRateLimit"."hits" + 1
                 END) >= ${maxAttempts} THEN 1
          WHEN (CASE
                  WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
                    AND "SecurityRateLimit"."penaltyLevel" = 2 THEN 0
                  ELSE "SecurityRateLimit"."penaltyLevel"
                END) = 1
            AND (CASE
                   WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
                   ELSE "SecurityRateLimit"."hits" + 1
                 END) >= 2 THEN 2
          WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
            AND "SecurityRateLimit"."penaltyLevel" = 2 THEN 0
          ELSE "SecurityRateLimit"."penaltyLevel"
        END,
        "blockedUntil" = CASE
          WHEN "SecurityRateLimit"."blockedUntil" > CURRENT_TIMESTAMP
            THEN "SecurityRateLimit"."blockedUntil"
          WHEN (CASE
                  WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
                    AND "SecurityRateLimit"."penaltyLevel" = 2 THEN 0
                  ELSE "SecurityRateLimit"."penaltyLevel"
                END) = 0
            AND (CASE
                   WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
                   ELSE "SecurityRateLimit"."hits" + 1
                 END) >= ${maxAttempts}
            THEN CURRENT_TIMESTAMP + (${initialLockMs} * INTERVAL '1 millisecond')
          WHEN (CASE
                  WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
                    AND "SecurityRateLimit"."penaltyLevel" = 2 THEN 0
                  ELSE "SecurityRateLimit"."penaltyLevel"
                END) = 1
            AND (CASE
                   WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
                   ELSE "SecurityRateLimit"."hits" + 1
                 END) >= 2
            THEN CURRENT_TIMESTAMP + (${escalatedLockMs} * INTERVAL '1 millisecond')
          ELSE NULL
        END,
        "expiresAt" = CASE
          WHEN "SecurityRateLimit"."blockedUntil" > CURRENT_TIMESTAMP
            THEN "SecurityRateLimit"."expiresAt"
          WHEN (CASE
                  WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
                    AND "SecurityRateLimit"."penaltyLevel" = 2 THEN 0
                  ELSE "SecurityRateLimit"."penaltyLevel"
                END) = 0
            AND (CASE
                   WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
                   ELSE "SecurityRateLimit"."hits" + 1
                 END) >= ${maxAttempts}
            THEN CURRENT_TIMESTAMP + (${initialLockMs} * INTERVAL '1 millisecond')
          WHEN (CASE
                  WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
                    AND "SecurityRateLimit"."penaltyLevel" = 2 THEN 0
                  ELSE "SecurityRateLimit"."penaltyLevel"
                END) = 1
            AND (CASE
                   WHEN "SecurityRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
                   ELSE "SecurityRateLimit"."hits" + 1
                 END) >= 2
            THEN CURRENT_TIMESTAMP + (${escalatedLockMs} * INTERVAL '1 millisecond')
          ELSE CURRENT_TIMESTAMP + (${windowMs} * INTERVAL '1 millisecond')
        END,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "key", "hits", "expiresAt", "blockedUntil", "penaltyLevel"
    `);
  }

  private toCustomerResult(
    accountBlocked: boolean,
    ipBlocked: boolean,
    blockedUntil?: Date,
  ): CustomerLoginLimitResult {
    return {
      blocked: accountBlocked || ipBlocked,
      accountBlocked,
      ipBlocked,
      retryAfterSeconds: blockedUntil
        ? Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000))
        : 0,
    };
  }

  tooManyRequests(blockedUntil?: Date): HttpException {
    const retryAfterSeconds = blockedUntil
      ? Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000))
      : undefined;
    return new HttpException(
      {
        message: 'Demasiados intentos. Intenta nuevamente mas tarde.',
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private keyFor(scope: string, value: string): string {
    const secret = process.env.RATE_LIMIT_KEY_SECRET?.trim() || 'development-rate-limit-key';
    return `${scope}:${createHmac('sha256', secret).update(value.trim().toLowerCase()).digest('hex')}`;
  }

  private get customerLoginMaxAttempts(): number {
    return getPositiveInteger(
      'CUSTOMER_LOGIN_MAX_ATTEMPTS',
      SECURITY_DEFAULTS.customerLoginMaxAttempts,
    );
  }
  private get customerLoginWindowMs(): number {
    return (
      getPositiveInteger(
        'CUSTOMER_LOGIN_WINDOW_MINUTES',
        SECURITY_DEFAULTS.customerLoginWindowMinutes,
      ) * 60_000
    );
  }
  private get customerLoginInitialLockMs(): number {
    return (
      getPositiveInteger(
        'CUSTOMER_LOGIN_INITIAL_LOCK_MINUTES',
        SECURITY_DEFAULTS.customerLoginInitialLockMinutes,
      ) * 60_000
    );
  }
  private get customerLoginEscalatedLockMs(): number {
    return (
      getPositiveInteger(
        'CUSTOMER_LOGIN_ESCALATED_LOCK_HOURS',
        SECURITY_DEFAULTS.customerLoginEscalatedLockHours,
      ) *
      60 *
      60_000
    );
  }
  private get customerLoginIpMaxAttempts(): number {
    return getPositiveInteger(
      'CUSTOMER_LOGIN_IP_MAX_ATTEMPTS',
      SECURITY_DEFAULTS.customerLoginIpMaxAttempts,
    );
  }
}
