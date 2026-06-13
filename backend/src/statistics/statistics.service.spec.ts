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
      findUnique: jest.fn(async ({ where }: any) =>
        products.find((product) => product.id === where.id) ? { id: where.id } : null,
      ),
    },
    orderItem: {
      groupBy: jest.fn(async () => []),
    },
    stockAlertState: {
      findMany: jest.fn(async () => [] as any[]),
      upsert: jest.fn(async ({ create, update }: any) => ({
        productId: create?.productId,
        alertType: create?.alertType,
        status: update?.status ?? create?.status,
        updatedAt: new Date(),
      })),
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
      riskProducts: null,
      riskAvailable: false,
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
      risk: null,
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
      risk: null,
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
        mode: 'HEURISTIC_V1',
        summary: {
          totalProducts: 1,
          riskProducts: 1,
          criticalProducts: 0,
          insufficientDataProducts: 0,
        },
        items: [
          {
            productId: 'ai-risk',
            name: 'Producto IA',
            riskScore: 88,
            riskLevel: 'HIGH',
            status: 'RISK',
            estimatedDaysToStockout: 5,
            recommendedAction: 'Reponer pronto',
            recommendedQuantity: 4,
            signals: {
              stockPressure: 70,
              salesVelocity: 82,
              replenishmentRisk: 80,
              dataQuality: 90,
            },
            reasons: ['La rotacion reciente indica riesgo de quiebre.'],
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
    expect(dashboard.summary).toMatchObject({
      riskProducts: 1,
      riskAvailable: true,
    });
    expect(dashboard.alerts[0]).toMatchObject({
      productId: 'ai-risk',
      alertType: 'PREDICTIVE_RISK',
      status: 'PREDICTIVE_RISK',
      risk: 88,
      recommendation: 'Reponer pronto',
      riskLevel: 'HIGH',
      recommendedQuantity: 4,
    });
  });

  it('no cuenta stock bajo como riesgo predictivo si ai-service no esta disponible', async () => {
    delete process.env.AI_SERVICE_URL;
    const { service } = createService([createProduct({ id: 'low', stock: 1 })]);

    const dashboard = await service.getInventoryDashboard();

    expect(dashboard.summary).toMatchObject({
      lowStockProducts: 1,
      riskProducts: null,
      riskAvailable: false,
    });
    expect(dashboard.alerts).toHaveLength(1);
    expect(dashboard.alerts[0]).toMatchObject({
      alertType: 'LOW_STOCK',
      risk: null,
    });
  });

  it('oculta alertas revisadas u omitidas de la vista activa', async () => {
    delete process.env.AI_SERVICE_URL;
    const { service, prisma } = createService([
      createProduct({ id: 'low-hidden', name: 'Stock bajo omitido', stock: 2 }),
    ]);
    prisma.stockAlertState.findMany.mockResolvedValueOnce([
      {
        productId: 'low-hidden',
        alertType: 'LOW_STOCK',
        status: 'DISMISSED',
      },
    ]);

    const dashboard = await service.getInventoryDashboard();

    expect(dashboard.alerts).toHaveLength(0);
  });

  it('guarda estado de alerta sin modificar el stock del producto', async () => {
    const { service, prisma } = createService([createProduct({ id: 'low', stock: 2 })]);

    await service.updateStockAlertState({
      productId: 'low',
      alertType: 'LOW_STOCK',
      status: 'REVIEWED',
      reviewedByUserId: 'admin-1',
    });

    expect(prisma.stockAlertState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          productId: 'low',
          alertType: 'LOW_STOCK',
          status: 'REVIEWED',
          reviewedByUserId: 'admin-1',
        }),
      }),
    );
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});
