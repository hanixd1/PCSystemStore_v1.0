import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'user-1',
          email: 'user@test.com',
          name: 'Usuario',
          role: 'CUSTOMER',
        })),
      },
      accountToken: { create: jest.fn(async () => undefined) },
      actionLog: { create: jest.fn(async () => undefined) },
      $queryRaw: jest.fn(async () => [
        {
          key: 'test',
          hits: 1,
          expiresAt: new Date(Date.now() + 60_000),
          blockedUntil: null,
          penaltyLevel: 0,
        },
      ]),
    };
    const email = { sendPasswordResetEmail: jest.fn(async () => undefined) };
    const rateLimit = { consume: jest.fn(async () => undefined) };
    return { service: new PasswordResetService(prisma as any, email as any, undefined as never, rateLimit as any), email, rateLimit };
  };

  it('usa FRONTEND_URL para el reset de cliente', async () => {
    process.env.FRONTEND_URL = 'https://store.example/';
    process.env.CLIENT_RESET_PASSWORD_PATH = '/auth/reset-password';
    const { service, email } = createService();

    await service.forgotPassword('USER@test.com', 'client');

    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        resetLink: expect.stringMatching(/^https:\/\/store\.example\/auth\/reset-password\?token=/),
      }),
    );
  });

  it('usa ADMIN_FRONTEND_URL y conserva la ruta admin', async () => {
    process.env.FRONTEND_URL = 'https://store.example';
    process.env.ADMIN_FRONTEND_URL = 'https://admin.example/';
    process.env.ADMIN_RESET_PASSWORD_PATH = '/admin/reset-password';
    const { service, email } = createService();
    (service as any).prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN',
    });

    await service.forgotPassword('admin@test.com', 'admin');

    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        resetLink: expect.stringMatching(
          /^https:\/\/admin\.example\/admin\/reset-password\?token=/,
        ),
      }),
    );
  });

  it('restablece con Argon2id y desbloquea una cuenta administrativa', async () => {
    const user = {
      id: 'admin-1',
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN',
      failedLoginAttempts: 4,
      failedLoginWindowStartedAt: new Date(),
      lockedUntil: new Date(Date.now() + 60_000),
      lastFailedLoginAt: new Date(),
    };
    const prisma = {
      user: { update: jest.fn(async ({ data }) => ({ ...user, ...data })) },
      accountToken: {
        findFirst: jest.fn(async () => ({ id: 'token-1', user })),
        update: jest.fn(async () => undefined),
      },
      actionLog: { create: jest.fn(async () => undefined) },
    };
    const service = new PasswordResetService(prisma as never, {} as never);

    await service.resetPassword('token-seguro', 'frase administrativa segura', 'admin');

    const update = prisma.user.update.mock.calls[0][0];
    expect(update.data.password).toMatch(/^\$argon2id\$/);
    expect(update.data).toEqual(
      expect.objectContaining({
        failedLoginAttempts: 0,
        failedLoginWindowStartedAt: null,
        lockedUntil: null,
        lastFailedLoginAt: null,
      }),
    );
    expect(prisma.actionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADMIN_ACCOUNT_UNLOCKED' }),
      }),
    );
  });
});
