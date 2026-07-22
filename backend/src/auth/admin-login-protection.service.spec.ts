import type { PrismaService } from '../prisma/prisma.service';
import {
  AdminLoginProtectionService,
  LoginProtectionState,
} from './admin-login-protection.service';

describe('AdminLoginProtectionService', () => {
  const originalAttempts = process.env.ADMIN_LOGIN_MAX_ATTEMPTS;
  let state: LoginProtectionState;
  let prisma: Pick<PrismaService, '$queryRaw' | 'user'>;

  beforeEach(() => {
    process.env.ADMIN_LOGIN_MAX_ATTEMPTS = '4';
    state = {
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
      lastFailedLoginAt: null,
    };
    prisma = {
      $queryRaw: jest.fn(async () => {
        const now = new Date();
        state.failedLoginAttempts += 1;
        state.failedLoginWindowStartedAt ??= now;
        state.lastFailedLoginAt = now;
        if (state.failedLoginAttempts >= 4) {
          state.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
        }
        return [{ ...state }];
      }) as PrismaService['$queryRaw'],
      user: {
        update: jest.fn(async ({ data }) => {
          state = {
            failedLoginAttempts: Number(data.failedLoginAttempts ?? 0),
            failedLoginWindowStartedAt: null,
            lockedUntil: null,
            lastFailedLoginAt: null,
          };
          return { id: 'admin-1' };
        }),
      } as unknown as PrismaService['user'],
    };
  });

  afterAll(() => {
    process.env.ADMIN_LOGIN_MAX_ATTEMPTS = originalAttempts;
  });

  it('los tres primeros fallos no bloquean y el cuarto activa bloqueo temporal', async () => {
    const service = new AdminLoginProtectionService(prisma as PrismaService);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await service.registerFailure('admin-1');
      expect(result.failedLoginAttempts).toBe(attempt);
      expect(result.lockedUntil).toBeNull();
    }

    const fourth = await service.registerFailure('admin-1');
    expect(fourth.failedLoginAttempts).toBe(4);
    expect(service.isLocked(fourth)).toBe(true);
  });

  it('cuatro fallos concurrentes usan una unica actualizacion atomica por solicitud', async () => {
    const service = new AdminLoginProtectionService(prisma as PrismaService);
    const results = await Promise.all(
      Array.from({ length: 4 }, () => service.registerFailure('admin-1')),
    );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(4);
    expect(Math.max(...results.map((result) => result.failedLoginAttempts))).toBe(4);
    expect(results.some((result) => service.isLocked(result))).toBe(true);
  });

  it('el bloqueo persiste entre instancias, expira y puede reiniciarse', async () => {
    const firstInstance = new AdminLoginProtectionService(prisma as PrismaService);
    await Promise.all(Array.from({ length: 4 }, () => firstInstance.registerFailure('admin-1')));

    const restartedInstance = new AdminLoginProtectionService(prisma as PrismaService);
    expect(restartedInstance.isLocked(state)).toBe(true);
    expect(restartedInstance.isLocked(state, new Date(Date.now() + 16 * 60 * 1000))).toBe(false);

    await restartedInstance.reset('admin-1', true);
    expect(state.failedLoginAttempts).toBe(0);
    expect(state.lockedUntil).toBeNull();
  });
});
