import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerRequest,
} from '@nestjs/throttler';

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
