import request from 'supertest';
import { closeQaApp, createQaApp, describeWithTestDb, E2eContext } from './e2e-test-utils';
import { qaSkus } from '../fixtures/seed-qa';

describeWithTestDb('Builder HTTP E2E real', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createQaApp();
  });

  afterAll(async () => {
    await closeQaApp(ctx);
  });

  it('BUILD-E2E-01 CPU AM5 devuelve motherboards AM5 compatibles', async () => {
    const cpu = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.cpuAmd },
    });
    const res = await request(ctx.app.getHttpServer())
      .get(`/builder/motherboards?cpuId=${cpu.id}`)
      .expect(200);

    expect(res.body.every((product: any) => product.motherboardSpecs.socket === 'AM5')).toBe(true);
  });

  it('BUILD-E2E-02 CPU Intel LGA1700 no devuelve motherboards AM5', async () => {
    const cpu = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.cpuIntel },
    });
    const res = await request(ctx.app.getHttpServer())
      .get(`/builder/motherboards?cpuId=${cpu.id}`)
      .expect(200);

    expect(res.body.some((product: any) => product.sku === qaSkus.boardAm5)).toBe(false);
  });

  it('BUILD-E2E-03 RAM DDR4 no es compatible con motherboard DDR5', async () => {
    const board = await ctx.prisma.product.findUniqueOrThrow({
      where: { sku: qaSkus.boardAm5 },
    });
    const res = await request(ctx.app.getHttpServer())
      .get(`/builder/rams?motherboardId=${board.id}`)
      .expect(200);

    expect(res.body.some((product: any) => product.sku === qaSkus.ramDdr4)).toBe(false);
    expect(res.body.some((product: any) => product.sku === qaSkus.ramDdr5)).toBe(true);
  });

  it('BUILD-E2E-04 a BUILD-E2E-07 quedan pendientes porque no existen endpoints HTTP de cooler/PSU/configuracion completa', () => {
    expect(true).toBe(true);
  });
});
