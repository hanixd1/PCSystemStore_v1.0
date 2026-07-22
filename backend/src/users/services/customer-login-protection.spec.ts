import { HttpException, UnauthorizedException } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';

describe('UserAuthService customer login protection', () => {
  const allowed = { blocked: false, accountBlocked: false, ipBlocked: false, retryAfterSeconds: 0 };
  const blocked = {
    blocked: true,
    accountBlocked: true,
    ipBlocked: false,
    retryAfterSeconds: 3600,
  };

  function createService(
    options: {
      user?: Record<string, unknown> | null;
      failure?: typeof allowed | typeof blocked;
    } = {},
  ) {
    const user =
      options.user === undefined
        ? {
            id: 'customer-1',
            email: 'customer@example.com',
            password: 'hash',
            role: 'CUSTOMER',
            status: 'ACTIVE',
          }
        : options.user;
    const prisma = {
      user: { findUnique: jest.fn(async () => user), update: jest.fn(async () => user) },
      actionLog: { create: jest.fn(async () => undefined) },
    };
    const passwordHashing = {
      verifyPassword: jest.fn(async () => false),
      simulateVerification: jest.fn(async () => undefined),
      needsRehash: jest.fn(() => false),
      hashPassword: jest.fn(),
    };
    const storage = {
      assertCustomerLoginAllowed: jest.fn(async () => allowed),
      recordCustomerLoginFailure: jest.fn(async () => options.failure ?? allowed),
      resetCustomerLogin: jest.fn(async () => undefined),
      tooManyRequests: jest.fn(
        () => new HttpException('Demasiados intentos. Intenta nuevamente mas tarde.', 429),
      ),
    };
    const session = { buildSession: jest.fn(async () => ({ token: 'session', user })) };
    const service = new UserAuthService(
      prisma as never,
      session as never,
      undefined as never,
      undefined as never,
      passwordHashing as never,
      undefined as never,
      storage as never,
    );
    return { service, prisma, passwordHashing, storage, session };
  }

  it('el cuarto fallo activa el bloqueo y los tres anteriores conservan una respuesta genérica', async () => {
    const first = createService({ failure: allowed });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        first.service.customerLogin(' CUSTOMER@EXAMPLE.COM ', 'bad'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(first.storage.recordCustomerLoginFailure).toHaveBeenCalledTimes(3);

    const fourth = createService({ failure: blocked });
    const error = await fourth.service
      .customerLogin('customer@example.com', 'bad')
      .catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect(fourth.storage.recordCustomerLoginFailure).toHaveBeenCalledWith(
      'customer@example.com',
      'unknown',
    );
  });

  it('durante el bloqueo no verifica la contraseña y devuelve 429', async () => {
    const { service, passwordHashing, storage } = createService();
    storage.assertCustomerLoginAllowed.mockResolvedValue(blocked);

    const error = await service
      .customerLogin('customer@example.com', 'bad')
      .catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect(passwordHashing.verifyPassword).not.toHaveBeenCalled();
  });

  it('un éxito normaliza el correo y reinicia el contador de cuenta', async () => {
    const { service, passwordHashing, storage, session } = createService();
    passwordHashing.verifyPassword.mockResolvedValue(true);

    await service.customerLogin(' CUSTOMER@EXAMPLE.COM ', 'correcta');

    expect(storage.assertCustomerLoginAllowed).toHaveBeenCalledWith(
      'customer@example.com',
      'unknown',
    );
    expect(storage.resetCustomerLogin).toHaveBeenCalledWith('customer@example.com');
    expect(session.buildSession).toHaveBeenCalled();
  });

  it('una cuenta inexistente tiene la misma respuesta pública que una contraseña inválida', async () => {
    const missing = createService({ user: null });
    const invalid = createService();

    const [missingError, invalidError] = await Promise.all([
      missing.service.customerLogin('missing@example.com', 'bad').catch((error: unknown) => error),
      invalid.service.customerLogin('customer@example.com', 'bad').catch((error: unknown) => error),
    ]);

    expect(missingError).toMatchObject({ message: 'Credenciales invalidas.' });
    expect(invalidError).toMatchObject({ message: 'Credenciales invalidas.' });
    expect(missing.passwordHashing.simulateVerification).toHaveBeenCalled();
  });
});
