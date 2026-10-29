import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerRequest,
} from '@nestjs/throttler';
import { MEMORY_THROTTLE_PREFIX } from './hybrid-throttler.storage';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/** Reads under these prefixes stay on the shared PostgreSQL counters (account-related). */
const SHARED_LIMIT_PREFIXES = ['/users', '/orders', '/payments', '/ai'];

@Injectable()
export class SecurityThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: Record<string, unknown>): Promise<string> {
    const user = request.user as { sub?: string } | undefined;
    const path = String(request.originalUrl ?? request.url ?? '');
    if ((path.includes('/products/import/') || path.includes('/ai/chat')) && user?.sub) {
      return `user:${user.sub}`;
    }
    return `ip:${String(request.ip ?? 'unknown')}`;
  }

  /** Public reads are counted in memory (HybridThrottlerStorage); see its doc comment. */
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const key = super.generateKey(context, suffix, name);
    const request = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
    }>();
    const path = String(request.originalUrl ?? request.url ?? '').split('?')[0];
    const isPublicRead =
      SAFE_METHODS.has(String(request.method ?? '').toUpperCase()) &&
      !SHARED_LIMIT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    return isPublicRead ? `${MEMORY_THROTTLE_PREFIX}${key}` : key;
  }

  protected async handleRequest(properties: ThrottlerRequest): Promise<boolean> {
    const { req } = this.getRequestResponse(properties.context);
    const path = String(req.originalUrl ?? req.url ?? '');
    if (path.includes('/ai/chat') && !req.user) {
      return super.handleRequest({ ...properties, limit: Math.min(properties.limit, 10) });
    }
    return super.handleRequest(properties);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);
    const remainingMs = detail.timeToBlockExpire || detail.timeToExpire;
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil(remainingMs / 1000))));
    throw new HttpException(
      'Demasiadas solicitudes. Intenta nuevamente mas tarde.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
