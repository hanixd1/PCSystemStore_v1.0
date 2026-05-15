import { BadRequestException, ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  const createService = () => {
    const records: any[] = [];
    const prisma = {
      idempotencyKey: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id) {
            return records.find((record) => record.id === where.id) ?? null;
          }

          const key = where.key_route_method;
          return (
            records.find(
              (record) =>
                record.key === key.key &&
                record.route === key.route &&
                record.method === key.method,
            ) ?? null
          );
        }),
        create: jest.fn(async ({ data }: any) => {
          const existing = records.find(
            (record) =>
              record.key === data.key &&
              record.route === data.route &&
              record.method === data.method,
          );

          if (existing) {
            const error = new Error('Unique constraint');
            (error as any).code = 'P2002';
            throw error;
          }

          const record = { id: `idem-${records.length + 1}`, ...data };
          records.push(record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const index = records.findIndex((record) => record.id === where.id);
          records[index] = { ...records[index], ...data };
          return records[index];
        }),
        deleteMany: jest.fn(async ({ where }: any) => {
          const initialLength = records.length;
          for (let index = records.length - 1; index >= 0; index -= 1) {
            if (records[index].expiresAt < where.expiresAt.lt) {
              records.splice(index, 1);
            }
          }
          return { count: initialLength - records.length };
        }),
      },
    };

    return {
      records,
      service: new IdempotencyService(prisma as any),
    };
  };

  it('rechaza endpoints criticos sin Idempotency-Key', async () => {
    const { service } = createService();

    await expect(
      service.run({
        key: undefined,
        route: '/orders',
        method: 'POST',
        body: {},
        userId: 'user-1',
        successStatusCode: 201,
        handler: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('procesa una solicitud nueva y devuelve la respuesta guardada en el reintento', async () => {
    const { service } = createService();
    const handler = jest.fn(async () => ({ id: 'order-1', total: 100 }));

    const first = await service.run({
      key: 'key-1',
      route: '/orders',
      method: 'POST',
      body: { items: [{ productId: 'p1', quantity: 1 }] },
      userId: 'user-1',
      successStatusCode: 201,
      handler,
    });

    const replay = await service.run({
      key: 'key-1',
      route: '/orders',
      method: 'POST',
      body: { items: [{ quantity: 1, productId: 'p1' }] },
      userId: 'user-1',
      successStatusCode: 201,
      handler,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.body).toEqual({ id: 'order-1', total: 100 });
  });

  it('rechaza la misma clave con payload diferente', async () => {
    const { service } = createService();

    await service.run({
      key: 'key-2',
      route: '/payments/simulate',
      method: 'POST',
      body: { orderId: 'order-1', simulateResult: 'APPROVED' },
      userId: 'user-1',
      successStatusCode: 201,
      handler: jest.fn(async () => ({ id: 'payment-1' })),
    });

    await expect(
      service.run({
        key: 'key-2',
        route: '/payments/simulate',
        method: 'POST',
        body: { orderId: 'order-1', simulateResult: 'REJECTED' },
        userId: 'user-1',
        successStatusCode: 201,
        handler: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza una clave que ya esta en procesamiento', async () => {
    const { records, service } = createService();
    records.push({
      id: 'idem-processing',
      key: 'key-processing',
      route: '/payments/manual',
      method: 'POST',
      userId: 'user-1',
      requestHash: service.buildRequestHash({ orderId: 'order-1' }, 'user-1'),
      status: 'PROCESSING',
      expiresAt: new Date(Date.now() + 60000),
    });

    await expect(
      service.run({
        key: 'key-processing',
        route: '/payments/manual',
        method: 'POST',
        body: { orderId: 'order-1' },
        userId: 'user-1',
        successStatusCode: 201,
        handler: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('prepara limpieza de claves expiradas', async () => {
    const { records, service } = createService();
    records.push(
      { id: 'old', expiresAt: new Date('2026-01-01T00:00:00.000Z') },
      { id: 'new', expiresAt: new Date('2026-12-01T00:00:00.000Z') },
    );

    await expect(service.deleteExpiredKeys(new Date('2026-05-14T00:00:00.000Z'))).resolves.toEqual({
      count: 1,
    });
    expect(records).toEqual([{ id: 'new', expiresAt: new Date('2026-12-01T00:00:00.000Z') }]);
  });
});
