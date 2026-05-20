import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY, JwtUserPayload, ROLES_KEY, UserRole } from './auth.constants';

type AuthenticatedRequest = Request & { user?: JwtUserPayload };

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) {
    return '';
  }

  return (
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ''
  );
}

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

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const cookieHeader = request.headers.cookie;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [];
    const needsCustomerSession = roles.includes('CUSTOMER');
    const needsAdminSession = roles.some((role) => ['ADMIN', 'EDITOR', 'EMPLOYEE'].includes(role));
    const cookieToken = needsCustomerSession
      ? getCookieValue(cookieHeader, 'pcs_customer_session')
      : needsAdminSession
        ? getCookieValue(cookieHeader, 'pcs_admin_session')
        : getCookieValue(cookieHeader, 'pcs_customer_session') ||
          getCookieValue(cookieHeader, 'pcs_admin_session');

    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';
    const token = cookieToken || bearerToken;

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
