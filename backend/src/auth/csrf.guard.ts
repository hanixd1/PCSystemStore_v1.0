import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { getCsrfAllowedOrigins } from '../security/security.config';
import {
  ADMIN_SESSION_COOKIE,
  CSRF_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  getCookieValue,
} from './auth-cookies';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const usesCookieSession = Boolean(
      getCookieValue(request, CUSTOMER_SESSION_COOKIE) ||
      getCookieValue(request, ADMIN_SESSION_COOKIE),
    );
    if (!usesCookieSession) {
      return true;
    }

    this.assertTrustedSource(request);
    const cookieToken = getCookieValue(request, CSRF_COOKIE) ?? '';
    const headerValue = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(headerValue) ? (headerValue[0] ?? '') : (headerValue ?? '');
    if (!this.safeEqual(cookieToken, headerToken)) {
      throw new ForbiddenException('Solicitud de seguridad invalida.');
    }
    return true;
  }

  private assertTrustedSource(request: Request): void {
    const allowed = getCsrfAllowedOrigins();
    const origin = request.headers.origin;
    if (origin) {
      if (!allowed.includes(origin)) {
        throw new ForbiddenException('Origen de solicitud no permitido.');
      }
      // The documented Vercel -> Railway topology is cross-site. Such requests are
      // accepted only for an explicit allowlisted Origin and still require the CSRF token.
      return;
    }
    const referer = request.headers.referer;
    if (referer) {
      try {
        if (allowed.includes(new URL(referer).origin)) {
          return;
        }
      } catch {
        // Fall through to a generic rejection.
      }
    }
    const fetchSite = request.headers['sec-fetch-site'];
    if (fetchSite === 'cross-site' || fetchSite === 'none') {
      throw new ForbiddenException('Origen de solicitud no permitido.');
    }
    throw new ForbiddenException('Origen de solicitud no permitido.');
  }

  private safeEqual(left: string, right: string): boolean {
    if (!left || !right) {
      return false;
    }
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
