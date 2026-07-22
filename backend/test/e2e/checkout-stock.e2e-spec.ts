import request from 'supertest';
import { closeQaApp, createQaApp, describeWithTestDb, E2eContext } from './e2e-test-utils';
import { qaSkus } from '../fixtures/seed-qa';

describeWithTestDb('Checkout y stock HTTP E2E real', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createQaApp();
  });

  afterAll(async () => {
    await closeQaApp(ctx);
  });

  it('STOCK-E2E-01 cliente no puede comprar producto con stock 0', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.stockZero },
    });

    await request(ctx.app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({
        method: 'CARD_CREDIT',
        frontendPrice: 1,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(400);
  });

  it('STOCK-E2E-02 cliente no puede comprar cantidad mayor al stock', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.stockLow },
    });

    await request(ctx.app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({
        method: 'CARD_CREDIT',
        frontendPrice: 1,
        items: [{ productId: product.id, quantity: 2 }],
      })
      .expect(400);
  });

  it('STOCK-E2E-03/04 crea orden valida y guarda snapshot de precio normal', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.noSale },
    });

    const res = await request(ctx.app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({
        method: 'CARD_CREDIT',
        frontendPrice: 1,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    expect(Number(res.body.items[0].unitPriceSnapshot)).toBe(Number(product.price));
  });

  it('STOCK-E2E-05 guarda snapshot de salePrice si oferta activa', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.saleActive },
    });

    const res = await request(ctx.app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({
        method: 'CARD_CREDIT',
        frontendPrice: 1,
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    expect(Number(res.body.items[0].unitPriceSnapshot)).toBe(Number(product.salePrice));
  });

  it('STOCK-E2E-06 pago simulado aprobado descuenta stock', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.noSale },
    });
    const order = await request(ctx.app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({
        method: 'CARD_CREDIT',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post('/payments/simulate')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({
        orderId: order.body.id,
        method: 'CARD_CREDIT',
        simulateResult: 'APPROVED',
      })
      .expect(201);

    const updated = await ctx.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updated.stock).toBe(product.stock - 1);
  });
});
