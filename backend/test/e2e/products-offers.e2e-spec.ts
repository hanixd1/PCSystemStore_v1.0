import request from 'supertest';
import { closeQaApp, createQaApp, describeWithTestDb, E2eContext } from './e2e-test-utils';
import { qaSkus } from '../fixtures/seed-qa';

describeWithTestDb('Productos y ofertas HTTP E2E real', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createQaApp();
  });

  afterAll(async () => {
    await closeQaApp(ctx);
  });

  it('PROD-E2E-01 admin crea producto valido', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({
        name: 'QA Producto Creado HTTP',
        description: 'Producto creado mediante prueba HTTP real de Supertest.',
        price: 777,
        stock: 4,
        category: 'CPU',
        cpuBrand: 'AMD',
        socket: 'AM5',
        cores: 6,
        threads: 12,
        frequency: '4.7',
        tdp: 105,
        integratedGraphics: true,
        includesCooler: false,
        image: 'https://example.com/qa-created.png',
      })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.price).toBeDefined();
  });

  it('PROD-E2E-02 cliente no puede crear producto', () => {
    return request(ctx.app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .send({})
      .expect(403);
  });

  it('PROD-E2E-03/04 admin edita stock y precio normal', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { sku: qaSkus.noSale } });

    const res = await request(ctx.app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({ stock: 9, price: 950 })
      .expect(200);

    expect(res.body.stock).toBe(9);
    expect(Number(res.body.price)).toBe(950);
  });

  it('PROD-E2E-05 admin activa oferta valida', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { sku: qaSkus.noSale } });

    const res = await request(ctx.app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({ isOnSale: true, salePrice: 700 })
      .expect(200);

    expect(res.body.isOnSale).toBe(true);
    expect(Number(res.body.salePrice)).toBe(700);
  });

  it('PROD-E2E-06 rechaza oferta con salePrice >= price', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { sku: qaSkus.noSale } });

    return request(ctx.app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({ isOnSale: true, salePrice: 999999 })
      .expect(400);
  });

  it('PROD-E2E-07 desactiva oferta y DB queda salePrice null', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { sku: qaSkus.saleActive } });

    await request(ctx.app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({ isOnSale: false })
      .expect(200);

    const updated = await ctx.prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.isOnSale).toBe(false);
    expect(updated.salePrice).toBeNull();
  });

  it('PROD-E2E-08 editar producto sin oferta no exige salePrice', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { sku: qaSkus.noSale } });

    return request(ctx.app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({ description: 'Descripcion actualizada por HTTP sin activar oferta.' })
      .expect(200);
  });

  it('PROD-E2E-09 catalogo publico devuelve productos', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/products').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((product: any) => product.sku === qaSkus.noSale)).toBe(true);
  });
});
