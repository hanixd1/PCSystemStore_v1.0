import { PasswordResetService } from './password-reset.service';

/** Token flow with an in-memory AccountToken row and real compare-and-set semantics. */
function createTokenFlow(user: Record<string, unknown>) {
  const token: { id: string; usedAt: Date | null } = { id: 'token-1', usedAt: null };
  const prisma: any = {
    user: { update: jest.fn(async ({ data }: any) => ({ ...user, ...data })) },
    accountToken: {
      findFirst: jest.fn(async () => (token.usedAt ? null : { id: token.id, user })),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.id === token.id && where.usedAt === null && token.usedAt === null) {
          token.usedAt = data.usedAt;
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    actionLog: { create: jest.fn(async () => undefined) },
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma)),
  };
  const sessionStatus = { invalidate: jest.fn() };
  const service = new PasswordResetService(
    prisma as never,
    {} as never,
    undefined,
    undefined,
    sessionStatus as never,
  );
  return { prisma, service, token, sessionStatus };
}

describe('PasswordResetService token de un solo uso', () => {
  const customer = { id: 'customer-1', email: 'c@test.com', name: 'C', role: 'CUSTOMER' };

  it('una contrasena invalida no quema el enlace', async () => {
    const { service, token, prisma } = createTokenFlow(customer);

    await expect(service.resetPassword('token-seguro', 'corta', 'client')).rejects.toThrow();
    expect(token.usedAt).toBeNull();
    expect(prisma.user.update).not.toHaveBeenCalled();

    await service.resetPassword('token-seguro', 'frase de cliente segura 2026', 'client');
    expect(token.usedAt).toEqual(expect.any(Date));
  });

  it('dos usos paralelos del mismo enlace: solo uno cambia la contrasena', async () => {
    const { service, prisma } = createTokenFlow(customer);
    // Both requests find the link unused before either spends it.
    const found = await prisma.accountToken.findFirst();
    prisma.accountToken.findFirst.mockResolvedValue(found);

    const results = await Promise.allSettled([
      service.resetPassword('token-seguro', 'frase de cliente segura 2026', 'client'),
      service.resetPassword('token-seguro', 'otra frase de cliente segura', 'client'),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('al cambiar la contrasena invalida otros enlaces y las sesiones anteriores', async () => {
    const { service, prisma, sessionStatus } = createTokenFlow(customer);

    await service.resetPassword('token-seguro', 'frase de cliente segura 2026', 'client');

    expect(prisma.accountToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'customer-1', usedAt: null }),
      }),
    );
    expect(sessionStatus.invalidate).toHaveBeenCalledWith('customer-1');
  });
});

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
      accountToken: {
        create: jest.fn(async () => undefined),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
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
    const email = {
      sendPasswordResetEmail: jest.fn(async () => undefined),
      sendEmailVerificationEmail: jest.fn(async () => undefined),
    };
    const rateLimit = { consume: jest.fn(async () => undefined) };
    return {
      service: new PasswordResetService(prisma as any, email as any, undefined, rateLimit as any),
      email,
      rateLimit,
      prisma,
    };
  };

  it('responde igual para un correo registrado aunque falle el envio (sin enumeracion)', async () => {
    process.env.FRONTEND_URL = 'https://store.example';
    const { service, email, prisma } = createService();
    email.sendPasswordResetEmail.mockRejectedValueOnce(new Error('Resend 403'));

    const registered = await service.forgotPassword('user@test.com', 'client');
    prisma.user.findUnique.mockResolvedValueOnce(null as any);
    const unknown = await service.forgotPassword('nadie@test.com', 'client');

    expect(registered).toEqual(unknown);
  });

  it('reenvia la verificacion solo a clientes activos sin verificar e invalida enlaces previos', async () => {
    process.env.FRONTEND_URL = 'https://store.example';
    const { service, email, prisma, rateLimit } = createService();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Usuario',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerified: false,
    } as any);

    const pending = await service.resendEmailVerification('USER@test.com');

    expect(rateLimit.consume).toHaveBeenCalledWith(
      'email-verification:user@test.com',
      3,
      60 * 60 * 1000,
    );
    expect(prisma.accountToken.updateMany).toHaveBeenCalled();
    expect(email.sendEmailVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        link: expect.stringMatching(/^https:\/\/store\.example\/auth\/verify-email\?token=/),
      }),
    );

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-2',
      email: 'ok@test.com',
      name: 'Verificado',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerified: true,
    } as any);
    const verified = await service.resendEmailVerification('ok@test.com');

    expect(email.sendEmailVerificationEmail).toHaveBeenCalledTimes(1);
    expect(verified).toEqual(pending);
  });

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
    const { prisma, service } = createTokenFlow(user);

    await service.resetPassword('token-seguro', 'frase administrativa segura', 'admin');

    const update = prisma.user.update.mock.calls[0][0];
    expect(update.data.password).toMatch(/^\$argon2id\$/);
    expect(update.data).toEqual(
      expect.objectContaining({
        failedLoginAttempts: 0,
        failedLoginWindowStartedAt: null,
        lockedUntil: null,
        lastFailedLoginAt: null,
        passwordChangedAt: expect.any(Date),
      }),
    );
    expect(prisma.actionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADMIN_ACCOUNT_UNLOCKED' }),
      }),
    );
  });
});
