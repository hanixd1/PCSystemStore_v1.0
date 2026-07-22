import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY, JwtUserPayload, ROLES_KEY, UserRole } from './auth.constants';
import { ADMIN_SESSION_COOKIE, CUSTOMER_SESSION_COOKIE, getCookieValue } from './auth-cookies';

type AuthenticatedRequest = Request & { user?: JwtUserPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [];
    const needsCustomerSession = roles.includes('CUSTOMER');
    const needsAdminSession = roles.some((role) => ['ADMIN', 'EDITOR'].includes(role));
    const cookieToken = needsCustomerSession
      ? getCookieValue(request, CUSTOMER_SESSION_COOKIE)
      : needsAdminSession
        ? getCookieValue(request, ADMIN_SESSION_COOKIE)
        : getCookieValue(request, CUSTOMER_SESSION_COOKIE) ||
          getCookieValue(request, ADMIN_SESSION_COOKIE);

    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';
    const token = cookieToken || bearerToken;

    if (isPublic) {
      if (token) {
        try {
          request.user = await this.jwtService.verifyAsync<JwtUserPayload>(token);
        } catch {
          // Public routes remain public; optional identity only affects user-aware throttling.
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtUserPayload>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido o expirado');
    }
  }
}
