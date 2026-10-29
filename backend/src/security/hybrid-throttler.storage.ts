import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageService, type ThrottlerStorage } from '@nestjs/throttler';
import { SecurityRateLimitStorage } from './security-rate-limit.storage';

/** Keys with this prefix are counted in memory (see SecurityThrottlerGuard.generateKey). */
export const MEMORY_THROTTLE_PREFIX = 'mem:';

/**
 * Public catalog reads are counted in this instance's memory; everything else (logins, orders,
 * payments, chat, any write) in PostgreSQL, shared by every replica. A catalog GET therefore
 * never opens a database write, so a traffic spike cannot exhaust the Neon pool on counters.
 * With several replicas the in-memory limit applies per replica, an accepted trade-off for
 * idempotent public reads.
 */
@Injectable()
export class HybridThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly memory = new ThrottlerStorageService();

  constructor(private readonly shared: SecurityRateLimitStorage) {}

  increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string) {
    return key.startsWith(MEMORY_THROTTLE_PREFIX)
      ? this.memory.increment(key, ttl, limit, blockDuration, throttlerName)
      : this.shared.increment(key, ttl, limit, blockDuration, throttlerName);
  }

  onApplicationShutdown() {
    this.memory.onApplicationShutdown();
  }
}
