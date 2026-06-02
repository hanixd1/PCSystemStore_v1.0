import { StatisticsService } from './statistics.service';

const createDecimal = (value: number) => ({ toString: () => String(value) }) as any;

const createProduct = (overrides: Record<string, any> = {}) => ({
  id: overrides.id ?? 'product-1',
  name: overrides.name ?? 'Producto de prueba',
  category: overrides.category ?? 'CPU',
  price: createDecimal(overrides.price ?? 100),
  isOnSale: overrides.isOnSale ?? false,
  salePrice:
    overrides.salePrice === undefined || overrides.salePrice === null
      ? null
      : createDecimal(overrides.salePrice),
  stock: overrides.stock ?? 10,
  cpuSpecs: overrides.cpuSpecs ?? { id: 'cpu-spec' },
  motherboardSpecs: overrides.motherboardSpecs ?? null,
  ramSpecs: overrides.ramSpecs ?? null,
  gpuSpecs: overrides.gpuSpecs ?? null,
  psuSpecs: overrides.psuSpecs ?? null,
  caseSpecs: overrides.caseSpecs ?? null,
  storageSpecs: overrides.storageSpecs ?? null,
  monitorSpecs: overrides.monitorSpecs ?? null,
  keyboardSpecs: overrides.keyboardSpecs ?? null,
  mouseSpecs: overrides.mouseSpecs ?? null,
});

function createService(products: any[]) {
  const prisma = {
    product: {
      count: jest.fn(async () => products.length),
      findMany: jest.fn(async () => products),
    },
  };

  return {
    service: new StatisticsService(prisma as any),
    prisma,
  };
}

describe('StatisticsService', () => {
  const originalAiServiceUrl = process.env.AI_SERVICE_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.AI_SERVICE_URL = originalAiServiceUrl;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('calcula summary y valor estimado de inventario con precio normal y oferta', async () => {
    delete process.env.AI_SERVICE_URL;
    const { service } = createService([
      createProduct({ id: 'p1', price: 100, stock: 2 }),
      createProduct({ id: 'p2', price: 200, salePrice: 150, isOnSale: true, stock: 3 }),
      createProduct({ id: 'p3', price: 50, stock: 0 }),
    ]);

    const dashboard = await service.getInventoryDashboard();

    expect(dashboard.summary).toEqual({
      totalProducts: 3,
      outOfStockProducts: 1,
      lowStockProducts: 2,
      riskProducts: 3,
      estimatedInventoryValue: 650,
    });
  });

  it('marca productos sin stock como OUT_OF_STOCK y riesgo 100', async () => {
    delete process.env.AI_SERVICE_URL;
    const { service } = createService([
      createProduct({ id: 'empty', name: 'Sin stock', stock: 0 }),
    ]);

    const dashboard = await service.getInventoryDashboard();

    expect(dashboard.alerts[0]).toMatchObject({
      productId: 'empty',
      status: 'OUT_OF_STOCK',
      risk: 100,
      recommendation: 'Reponer urgente',
    });
  });

  it('marca productos con stock menor o igual a 3 como LOW_STOCK', async () => {
    delete process.env.AI_SERVICE_URL;
    const { service } = createService([createProduct({ id: 'low', name: 'Stock bajo', stock: 3 })]);

    const dashboard = await service.getInventoryDashboard();

    expect(dashboard.alerts[0]).toMatchObject({
      productId: 'low',
      status: 'LOW_STOCK',
      risk: 60,
      recommendation: 'Revisar reposicion',
    });
  });

  it('usa LOCAL_FALLBACK si ai-service falla', async () => {
    process.env.AI_SERVICE_URL = 'http://localhost:9999';
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as any;
    const { service } = createService([createProduct({ stock: 5 })]);

    const dashboard = await service.getInventoryDashboard();

    expect(dashboard.aiStatus).toMatchObject({
      available: false,
      mode: 'LOCAL_FALLBACK',
    });
  });

  it('combina riesgo de ai-service cuando esta disponible', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service.test';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        available: true,
        riskProducts: [
          {
            productId: 'ai-risk',
            risk: 88,
            status: 'BREAK_RISK',
            recommendation: 'Reponer 4 unidades',
          },
        ],
      }),
    })) as any;
    const { service } = createService([
      createProduct({ id: 'ai-risk', name: 'Producto IA', stock: 8 }),
    ]);

    const dashboard = await service.getInventoryDashboard();

    expect(dashboard.aiStatus).toMatchObject({
      available: true,
      mode: 'AI_SERVICE',
    });
    expect(dashboard.alerts[0]).toMatchObject({
      productId: 'ai-risk',
      status: 'BREAK_RISK',
      risk: 88,
      recommendation: 'Reponer 4 unidades',
    });
  });
});
