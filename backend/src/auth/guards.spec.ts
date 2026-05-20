import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

const createContext = (request: any) =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as any;

describe('Auth guards', () => {
  it('AUTH-05 ruta protegida sin token devuelve UnauthorizedException', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => false) };
    const jwtService = { verifyAsync: jest.fn() };
    const guard = new JwtAuthGuard(reflector as any, jwtService as any);

    await expect(guard.canActivate(createContext({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('AUTH-07 token invalido devuelve UnauthorizedException', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => false) };
    const jwtService = {
      verifyAsync: jest.fn(async () => {
        throw new Error('bad token');
      }),
    };
    const guard = new JwtAuthGuard(reflector as any, jwtService as any);

    await expect(
      guard.canActivate(createContext({ headers: { authorization: 'Bearer invalid' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('AUTH-06 ruta admin con token cliente devuelve ForbiddenException', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(createContext({ user: { sub: 'customer-1', role: 'CUSTOMER' } })),
    ).toThrow(ForbiddenException);
  });
});
