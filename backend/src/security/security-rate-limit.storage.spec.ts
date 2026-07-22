import { HttpException } from '@nestjs/common';
import { SecurityRateLimitStorage } from './security-rate-limit.storage';

describe('SecurityRateLimitStorage', () => {
  const row = (blockedUntil: Date | null = null, hits = 1) => ({
    key: 'opaque-key',
    hits,
    expiresAt: new Date(Date.now() + 60_000),
    blockedUntil,
    penaltyLevel: 0,
  });

  it('usa Prisma y nunca un Map local para el throttling distribuido', async () => {
    const prisma = {
      $queryRaw: jest.fn(async () => [row()]),
      securityRateLimit: { findMany: jest.fn(async () => []), deleteMany: jest.fn() },
    };
    const storage = new SecurityRateLimitStorage(prisma as any);

    await storage.increment('ip:test', 60_000, 2, 60_000, 'default');

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('convierte un limite de recuperacion bloqueado en 429 generico', async () => {
    const prisma = {
      $queryRaw: jest.fn(async () => [row(new Date(Date.now() + 60_000), 2)]),
      securityRateLimit: { findMany: jest.fn(async () => []), deleteMany: jest.fn() },
    };
    const storage = new SecurityRateLimitStorage(prisma as any);

    await expect(storage.consume('password-recovery:user@example.com', 1, 60_000)).rejects.toBeInstanceOf(HttpException);
  });

  it('consulta el estado por claves HMAC compartidas y no devuelve identificadores crudos', async () => {
    const prisma = {
      $queryRaw: jest.fn(),
      securityRateLimit: { findMany: jest.fn(async () => []), deleteMany: jest.fn() },
    };
    const storage = new SecurityRateLimitStorage(prisma as any);

    await storage.assertCustomerLoginAllowed(' User@Example.com ', '203.0.113.10');

    const query = prisma.securityRateLimit.findMany.mock.calls[0][0];
    expect(query.where.key.in.join(' ')).not.toContain('user@example.com');
    expect(query.where.key.in.join(' ')).not.toContain('203.0.113.10');
  });

  it('serializa cuenta e IP dentro de la misma transaccion atomica', async () => {
    const queryOrder: number[] = [];
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockImplementationOnce(async () => {
          queryOrder.push(1);
          return [row(null, 4)];
        })
        .mockImplementationOnce(async () => {
          queryOrder.push(2);
          return [row()];
        }),
    };
    const prisma = {
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      securityRateLimit: { findMany: jest.fn(), deleteMany: jest.fn() },
    };
    const storage = new SecurityRateLimitStorage(prisma as any);

    await storage.recordCustomerLoginFailure('customer@example.com', '203.0.113.10');

    expect(queryOrder).toEqual([1, 2]);
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('propaga un error de la segunda consulta para que Prisma haga rollback y libere el cliente', async () => {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([row()])
        .mockRejectedValueOnce(new Error('query failed')),
    };
    const prisma = {
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      securityRateLimit: { findMany: jest.fn(), deleteMany: jest.fn() },
    };
    const storage = new SecurityRateLimitStorage(prisma as any);

    await expect(
      storage.recordCustomerLoginFailure('customer@example.com', '203.0.113.10'),
    ).rejects.toThrow('query failed');
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
