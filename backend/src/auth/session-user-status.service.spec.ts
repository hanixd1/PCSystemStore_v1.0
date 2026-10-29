import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SessionUserStatusService, STATUS_CACHE_MAX_ENTRIES } from './session-user-status.service';

const payload = { sub: 'admin-1', email: 'admin@test.com', role: 'ADMIN' as const };

const createContext = (request: any) =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  }) as any;

describe('SessionUserStatusService', () => {
  const createService = (user: { status: string; role: string } | null) => {
    const prisma = { user: { findUnique: jest.fn(async () => user) } };
    return { service: new SessionUserStatusService(prisma as any), prisma };
  };

  it('acepta una cuenta ACTIVE con el mismo rol del token', async () => {
    const { service } = createService({ status: 'ACTIVE', role: 'ADMIN' });
    await expect(service.isSessionValid(payload)).resolves.toBe(true);
  });

  it.each([
    [{ status: 'INACTIVE', role: 'ADMIN' }],
    [{ status: 'ACTIVE', role: 'EDITOR' }],
    [null],
  ])('revoca la sesion de una cuenta suspendida, con otro rol o eliminada (%j)', async (user) => {
    const { service } = createService(user);
    await expect(service.isSessionValid(payload)).resolves.toBe(false);
  });

  it('revoca las sesiones emitidas antes del ultimo cambio de contrasena', async () => {
    const changedAt = new Date('2026-10-29T12:00:00Z');
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          status: 'ACTIVE',
          role: 'ADMIN',
          passwordChangedAt: changedAt,
        })),
      },
    };
    const service = new SessionUserStatusService(prisma as any);
    const issued = (date: string) => ({ ...payload, iat: Date.parse(date) / 1000 });

    await expect(service.isSessionValid(issued('2026-10-29T11:59:00Z'))).resolves.toBe(false);
    await expect(service.isSessionValid(issued('2026-10-29T12:00:00Z'))).resolves.toBe(true);
  });

  it('reutiliza el estado unos segundos y lo olvida al invalidar', async () => {
    const { service, prisma } = createService({ status: 'ACTIVE', role: 'ADMIN' });
    await service.isSessionValid(payload, 0);
    await service.isSessionValid(payload, 1000);
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);

    service.invalidate(payload.sub);
    await service.isSessionValid(payload, 2000);
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);

    await service.isSessionValid(payload, 60_000);
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(3);
  });

  it('la cache no crece sin limite', async () => {
    const { service } = createService({ status: 'ACTIVE', role: 'ADMIN' });
    const cache = (service as any).cache as Map<string, unknown>;

    for (let index = 0; index < STATUS_CACHE_MAX_ENTRIES + 50; index += 1) {
      await service.isSessionValid({ ...payload, sub: `user-${index}` }, 0);
    }
    expect(cache.size).toBe(STATUS_CACHE_MAX_ENTRIES);
    expect(cache.has('user-0')).toBe(false);

    // Expired entries go first once the bound is reached.
    await service.isSessionValid({ ...payload, sub: 'late-user' }, 60_000);
    expect(cache.size).toBe(1);
  });

  it('JwtAuthGuard rechaza un token valido de una cuenta suspendida', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => undefined) };
    const jwtService = { verifyAsync: jest.fn(async () => payload) };
    const { service } = createService({ status: 'INACTIVE', role: 'ADMIN' });
    const guard = new JwtAuthGuard(reflector as any, jwtService as any, service);

    await expect(
      guard.canActivate(createContext({ headers: { authorization: 'Bearer valid' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
