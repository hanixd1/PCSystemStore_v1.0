import request from 'supertest';
import { closeQaApp, createQaApp, describeWithTestDb, E2eContext } from './e2e-test-utils';
import { qaSkus } from '../fixtures/seed-qa';

describeWithTestDb('Pagos manuales HTTP E2E real', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createQaApp();
  });

  afterAll(async () => {
    await closeQaApp(ctx);
  });

  async function createManualPayment() {
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { sku: qaSkus.noSale } });
    const order = await request(ctx.app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({ method: 'YAPE', items: [{ productId: product.id, quantity: 1 }] })
      .expect(201);

    const payment = await request(ctx.app.getHttpServer())
      .post('/payments/manual')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({ orderId: order.body.id, method: 'YAPE', operationCode: 'QA987654' })
      .expect(201);

    return { product, order: order.body, payment: payment.body };
  }

  it('PAY-E2E-01/02 cliente crea pago manual y queda PENDING_REVIEW', async () => {
    const { product, payment } = await createManualPayment();
    const unchanged = await ctx.prisma.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(payment.status).toBe('PENDING_REVIEW');
    expect(unchanged.stock).toBe(product.stock);
  });

  it('PAY-E2E-04 cliente no puede aprobar pago', async () => {
    const { payment } = await createManualPayment();

    return request(ctx.app.getHttpServer())
      .patch(`/admin/payments/${payment.id}/approve`)
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .expect(403);
  });

  it('PAY-E2E-05/06/07 admin aprueba pago y descuenta stock', async () => {
    const { product, payment } = await createManualPayment();

    const res = await request(ctx.app.getHttpServer())
      .patch(`/admin/payments/${payment.id}/approve`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .expect(200);

    const updated = await ctx.prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.order.status).toBe('PAID');
    expect(updated.stock).toBe(product.stock - 1);
  });

  it('PAY-E2E-08/09 admin rechaza pago y no descuenta stock', async () => {
    const { product, payment } = await createManualPayment();

    const res = await request(ctx.app.getHttpServer())
      .patch(`/admin/payments/${payment.id}/reject`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .expect(200);

    const updated = await ctx.prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(res.body.status).toBe('REJECTED');
    expect(updated.stock).toBe(product.stock);
  });
});
