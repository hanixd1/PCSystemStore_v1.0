import request from 'supertest';
import { closeQaApp, createQaApp, describeWithTestDb, E2eContext } from './e2e-test-utils';
import { qaUsers } from '../fixtures/seed-qa';

describeWithTestDb('Auth HTTP E2E real', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createQaApp();
  });

  afterAll(async () => {
    await closeQaApp(ctx);
  });

  it('AUTH-E2E-01 login cliente valido en endpoint cliente', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/users/customer-login')
      .send(qaUsers.customer)
      .expect(201);

    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('CUSTOMER');
  });

  it('AUTH-E2E-02 login admin valido en endpoint admin', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/users/admin-login')
      .send(qaUsers.admin)
      .expect(201);

    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('AUTH-E2E-03 admin no puede iniciar sesion por endpoint cliente', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/users/customer-login')
      .send(qaUsers.admin)
      .expect(403);

    expect(res.body.message).toContain('cliente');
    expect(res.body.token).toBeUndefined();
  });

  it('AUTH-E2E-04 cliente no puede iniciar sesion por endpoint admin', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/users/admin-login')
      .send(qaUsers.customer)
      .expect(403);

    expect(res.body.message).toContain('administrativos');
    expect(res.body.token).toBeUndefined();
  });

  it('AUTH-E2E-05 ruta admin sin token devuelve 401', () => {
    return request(ctx.app.getHttpServer()).get('/users').expect(401);
  });

  it('AUTH-E2E-06 ruta admin con token cliente devuelve 403', () => {
    return request(ctx.app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${ctx.tokens.customer}`)
      .expect(403);
  });

  it('AUTH-E2E-07 token invalido devuelve 401', () => {
    return request(ctx.app.getHttpServer())
      .get('/users')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('AUTH-E2E-08 ruta cliente protegida con token admin no funciona como cliente', () => {
    return request(ctx.app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${ctx.tokens.admin}`)
      .expect(403);
  });
});
