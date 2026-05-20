import request from 'supertest';
import { closeQaApp, createQaApp, describeWithTestDb, E2eContext } from './e2e-test-utils';
import { qaSkus, qaUsers } from '../fixtures/seed-qa';

describeWithTestDb('Auditoria HTTP E2E real', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createQaApp();
  });

  afterAll(async () => {
    await closeQaApp(ctx);
  });

  it('AUD-E2E-01 crear producto genera log', async () => {
    await request(ctx.app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({
        name: 'QA Producto Audit Create',
        description: 'Producto QA para validar auditoria de creacion via HTTP.',
        price: 555,
        stock: 3,
        category: 'CPU',
        cpuBrand: 'AMD',
        socket: 'AM5',
        cores: 6,
        threads: 12,
        frequency: '4.7',
        tdp: 105,
        integratedGraphics: true,
        includesCooler: false,
        image: 'https://example.com/audit-create.png',
      })
      .expect(201);

    const logs = await request(ctx.app.getHttpServer())
      .get('/admin/audit/products')
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .expect(200);

    expect(logs.body.some((log: any) => log.action === 'CREATE_PRODUCT')).toBe(true);
  });

  it('AUD-E2E-02/03 editar precio y stock genera valores anteriores/nuevos', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.noSale },
    });

    await request(ctx.app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({ price: 930, stock: 2 })
      .expect(200);

    const logs = await ctx.prisma.actionLog.findMany({
      where: { entityId: product.id },
    });
    expect(logs.some((log) => log.action === 'UPDATE_PRICE' && log.oldValue && log.newValue)).toBe(
      true,
    );
    expect(
      logs.some(
        (log) =>
          log.action === 'UPDATE_STOCK' && log.stockBefore !== null && log.stockAfter !== null,
      ),
    ).toBe(true);
  });

  it('AUD-E2E-04 desactivar oferta genera log', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.saleActive },
    });

    await request(ctx.app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({ isOnSale: false })
      .expect(200);

    const logs = await ctx.prisma.actionLog.findMany({
      where: { entityId: product.id },
    });
    expect(logs.some((log) => log.action === 'DISABLE_PRODUCT_SALE')).toBe(true);
  });

  it('AUD-E2E-06 endpoint auditoria sin token devuelve 401', () => {
    return request(ctx.app.getHttpServer()).get('/admin/audit/products').expect(401);
  });

  it('AUD-E2E-07 endpoint auditoria con cliente devuelve 403', () => {
    return request(ctx.app.getHttpServer())
      .get('/admin/audit/products')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .expect(403);
  });

  it('AUD-E2E-08 login cliente no aparece en auditoria administrativa', async () => {
    await request(ctx.app.getHttpServer())
      .post('/users/customer-login')
      .send(qaUsers.customer)
      .expect(201);

    const logs = await request(ctx.app.getHttpServer())
      .get('/admin/audit/security')
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .expect(200);

    expect(logs.body.some((log: any) => log.user?.role === 'CUSTOMER')).toBe(false);
  });
});
