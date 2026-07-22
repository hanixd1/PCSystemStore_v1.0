import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { closeQaApp, createQaApp, describeWithTestDb, E2eContext } from './e2e-test-utils';
import { qaSkus } from '../fixtures/seed-qa';

describeWithTestDb('Seguridad API HTTP E2E real', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createQaApp();
  });

  afterAll(async () => {
    await closeQaApp(ctx);
  });

  it('SEC-E2E-01 SQL Injection en login no autentica', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/users/customer-login')
      .send({ email: "' OR 1=1 --", password: "' OR 1=1 --" })
      .expect(401);

    expect(res.body.token).toBeUndefined();
  });

  it('SEC-E2E-02 SQL Injection en query de catalogo no rompe API', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/products?search=ryzen'%20OR%20'1'='1")
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('SEC-E2E-03 XSS en descripcion se rechaza por validacion actual', async () => {
    const product = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.noSale },
    });

    await request(ctx.app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .send({ description: "<script>alert('xss')</script>" })
      .expect(400);
  });

  it('SEC-E2E-04 endpoint admin sin token devuelve 401', () => {
    return request(ctx.app.getHttpServer()).get('/users').expect(401);
  });

  it('SEC-E2E-05 endpoint admin con token cliente devuelve 403', () => {
    return request(ctx.app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .expect(403);
  });

  it('SEC-E2E-06 .env.example no contiene secretos reales evidentes', () => {
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
    expect(envExample).not.toMatch(/api[_-]?key\s*=\s*[A-Za-z0-9]{24,}/i);
    expect(envExample).not.toMatch(/secret\s*=\s*[A-Za-z0-9]{24,}/i);
  });
});
