import { PRODUCT_CATEGORIES } from '../products/dto/create-product.dto';
import { CATEGORY_LABELS, StatisticsService } from './statistics.service';

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

describe('CATEGORY_LABELS', () => {
  it('tiene una etiqueta para cada categoria de producto', () => {
    expect(PRODUCT_CATEGORIES.filter((category) => !CATEGORY_LABELS[category])).toEqual([]);
  });
});

describe('StatisticsService inventory scope', () => {
  it('excluye productos retirados o desactivados del dashboard', async () => {
    const { service, prisma } = createService([createProduct({ stock: 0 })]);
    delete process.env.AI_SERVICE_URL;

    await service.getInventoryDashboard();

    const scope = { deletedAt: null, isActive: true };
    expect(prisma.product.count).toHaveBeenCalledWith({ where: scope });
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: scope }));
  });
});

describe('StatisticsService', () => {
  const originalAiServiceUrl = process.env.AI_SERVICE_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.AI_SERVICE_URL = originalAiServiceUrl;
    delete process.env.INTERNAL_API_KEY;
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
      riskCategories: null,
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

  it('combina el riesgo por categoria del sistema de pronostico', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service.test';
    process.env.INTERNAL_API_KEY = 'clave-interna-test';
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        month: '2026-11',
        horizon: 3,
        reliability: 'sensitivity',
        model: 'chronos_fine_tuned',
        lastObservedMonth: '2026-08',
        items: [
          {
            category: 'cpu',
            label: 'Procesador',
            stock: 3,
            forecastMedian: 12,
            forecastP90: 20,
            stockoutProbability: 0.9,
            bound: 'above',
            coverageMonths: 0.3,
            riskLevel: 'CRITICAL',
            suggestedReorder: 17,
          },
        ],
      }),
    }));
    global.fetch = fetchMock as any;
    const { service } = createService([
      createProduct({ id: 'cpu-a', category: 'CPU', stock: 1 }),
      createProduct({ id: 'cpu-b', category: 'CPU', stock: 2 }),
    ]);

    const dashboard = await service.getInventoryDashboard();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://ai-service.test/forecast/stock-coverage');
    expect(init.headers).toMatchObject({ 'X-Internal-API-Key': 'clave-interna-test' });
    expect(JSON.parse(String(init.body))).toEqual({ categories: [{ category: 'CPU', stock: 3 }] });
    expect(dashboard.aiStatus).toMatchObject({
      available: true,
      mode: 'AI_SERVICE',
      model: 'chronos_fine_tuned',
    });
    expect(dashboard.summary).toMatchObject({ riskCategories: 1, riskAvailable: true });
    expect(dashboard.forecastRisk?.items[0]).toMatchObject({
      category: 'cpu',
      riskLevel: 'CRITICAL',
    });
  });

  it('responde 503 si el pronostico mensual no esta disponible', async () => {
    delete process.env.AI_SERVICE_URL;
    const { service } = createService([]);

    await expect(service.getMonthForecast('2026-12')).rejects.toThrow(
      'El sistema de pronostico no esta disponible',
    );
  });

  it('propaga como 400 un mes fuera de rango del sistema de pronostico', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service.test';
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'El mes debe estar entre 2026-09 y 2027-08.' }),
    })) as any;
    const { service } = createService([]);

    await expect(service.getMonthForecast('2030-01')).rejects.toThrow('2026-09 y 2027-08');
  });

  it('no cuenta stock bajo como riesgo predictivo si ai-service no esta disponible', async () => {
    delete process.env.AI_SERVICE_URL;
    const { service } = createService([createProduct({ id: 'low', stock: 1 })]);

    const dashboard = await service.getInventoryDashboard();

    expect(dashboard.summary).toMatchObject({
      lowStockProducts: 1,
      riskCategories: null,
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
