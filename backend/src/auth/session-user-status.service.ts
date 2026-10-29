import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUserPayload } from './auth.constants';

/** How long a verified account state is reused before asking the database again. */
const STATUS_CACHE_TTL_MS = 15_000;
/** Upper bound of cached users; beyond it expired entries, then the oldest, are dropped. */
export const STATUS_CACHE_MAX_ENTRIES = 5_000;

type CachedStatus = {
  active: boolean;
  role: string | null;
  /** Sessions issued before this second (JWT iat) were revoked by a password change. */
  validSinceSeconds: number;
  expiresAt: number;
};

/**
 * A JWT stays valid until it expires, so suspending an account or changing its role must be
 * checked on every request: the account must still exist, be ACTIVE and keep the token's role.
 * A short in-memory cache keeps this to one query per user every few seconds.
 */
@Injectable()
export class SessionUserStatusService {
  private readonly cache = new Map<string, CachedStatus>();

  constructor(private readonly prisma: PrismaService) {}

  async isSessionValid(payload: JwtUserPayload, now = Date.now()): Promise<boolean> {
    let status = this.cache.get(payload.sub);
    if (!status || status.expiresAt <= now) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { status: true, role: true, passwordChangedAt: true },
      });
      status = {
        active: user?.status === 'ACTIVE',
        role: user?.role ?? null,
        validSinceSeconds: user?.passwordChangedAt
          ? Math.floor(user.passwordChangedAt.getTime() / 1000)
          : 0,
        expiresAt: now + STATUS_CACHE_TTL_MS,
      };
      // Re-insert so the Map keeps entries in refresh order (oldest first) for eviction.
      this.cache.delete(payload.sub);
      this.cache.set(payload.sub, status);
      this.evict(now);
    }
    const issuedAt = payload.iat ?? 0;
    return status.active && status.role === payload.role && issuedAt >= status.validSinceSeconds;
  }

  /** Keeps memory bounded however many distinct users hit the API. */
  private evict(now: number) {
    if (this.cache.size <= STATUS_CACHE_MAX_ENTRIES) {
      return;
    }
    for (const [userId, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(userId);
      }
    }
    for (const userId of this.cache.keys()) {
      if (this.cache.size <= STATUS_CACHE_MAX_ENTRIES) {
        break;
      }
      this.cache.delete(userId);
    }
  }

  /** Forget a user's cached state right after it is suspended, changes role or password. */
  invalidate(userId: string) {
    this.cache.delete(userId);
  }
}
