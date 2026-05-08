import request from 'supertest';
import { closeQaApp, createQaApp, describeWithTestDb, E2eContext } from './e2e-test-utils';
import { qaSkus } from '../fixtures/seed-qa';

describeWithTestDb('Stock concurrente HTTP E2E real', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createQaApp();
  });

  afterAll(async () => {
    await closeQaApp(ctx);
  });

  it('STOCK-CONC-E2E-01 dos pagos simultaneos sobre stock 1 no dejan stock negativo', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { sku: qaSkus.stockLow } });

    const [orderA, orderB] = await Promise.all([
      request(ctx.app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${ctx.tokens.customer}`)
        .send({ method: 'CARD_CREDIT', items: [{ productId: product.id, quantity: 1 }] }),
      request(ctx.app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${ctx.tokens.customer}`)
        .send({ method: 'CARD_CREDIT', items: [{ productId: product.id, quantity: 1 }] }),
    ]);

    expect(orderA.status).toBe(201);
    expect(orderB.status).toBe(201);

    const payments = await Promise.allSettled([
      request(ctx.app.getHttpServer())
        .post('/payments/simulate')
        .set('Authorization', `Bearer ${ctx.tokens.customer}`)
        .send({ orderId: orderA.body.id, method: 'CARD_CREDIT', simulateResult: 'APPROVED' }),
      request(ctx.app.getHttpServer())
        .post('/payments/simulate')
        .set('Authorization', `Bearer ${ctx.tokens.customer}`)
        .send({ orderId: orderB.body.id, method: 'CARD_CREDIT', simulateResult: 'APPROVED' }),
    ]);

    const statusCodes = payments.map((result: any) => result.value?.status).sort();
    const updated = await ctx.prisma.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(statusCodes).toEqual([201, 400]);
    expect(updated.stock).toBe(0);
  });
});
