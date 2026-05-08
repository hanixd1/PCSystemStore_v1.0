import { ProductsService } from './products.service';
import { ProductPricingService } from './services/product-pricing.service';

describe('ProductsService filtros de catalogo', () => {
  const createService = () => {
    const prisma = {
      product: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
      },
      $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    };
    const audit = { log: jest.fn() };

    return {
      service: new ProductsService(prisma as any, audit as any, new ProductPricingService()),
      prisma,
    };
  };

  it('filtra CPU por marca AMD', async () => {
    const { service, prisma } = createService();

    await service.findAll({ category: 'CPU', cpuBrand: 'AMD', page: '1', limit: '12' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'CPU',
          AND: expect.arrayContaining([{ cpuSpecs: { is: { brand: 'AMD' } } }]),
        }),
      }),
    );
  });

  it('filtra CPU por socket AM5', async () => {
    const { service, prisma } = createService();

    await service.findAll({ category: 'CPU', socket: 'AM5', page: '1' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ cpuSpecs: { is: { socket: 'AM5' } } }]),
        }),
      }),
    );
  });

  it('filtra motherboard por socket y tipo de RAM', async () => {
    const { service, prisma } = createService();

    await service.findAll({ category: 'MOTHERBOARD', socket: 'LGA 1700', ramType: 'DDR5', page: '1' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'MOTHERBOARD',
          AND: expect.arrayContaining([
            { motherboardSpecs: { is: { socket: 'LGA 1700', memoryType: 'DDR5' } } },
          ]),
        }),
      }),
    );
  });

  it('filtra rango de precio, stock y ofertas', async () => {
    const { service, prisma } = createService();

    await service.findAll({
      category: 'CPU',
      minPrice: '500',
      maxPrice: '1200',
      inStock: 'true',
      isOnSale: 'true',
      page: '2',
      limit: '10',
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          price: { gte: 500, lte: 1200 },
          stock: { gt: 0 },
          isOnSale: true,
        }),
        skip: 10,
        take: 10,
      }),
    );
  });

  it('combina cpuBrand, socket y rango de precio', async () => {
    const { service, prisma } = createService();

    await service.findAll({ category: 'CPU', cpuBrand: 'AMD', socket: 'AM5', minPrice: '600', maxPrice: '1600' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'CPU',
          price: { gte: 600, lte: 1600 },
          AND: expect.arrayContaining([{ cpuSpecs: { is: { brand: 'AMD', socket: 'AM5' } } }]),
        }),
      }),
    );
  });

  it('ignora filtros invalidos sin romper paginacion', async () => {
    const { service, prisma } = createService();

    await expect(service.findAll({ category: 'CPU', minPrice: 'abc', unknown: 'value' } as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    expect(prisma.product.count).toHaveBeenCalled();
  });

  it('devuelve opciones dinamicas de filtros desde productos existentes', async () => {
    const { service, prisma } = createService();
    (prisma.product.findMany as jest.Mock).mockResolvedValueOnce([
      {
        category: 'CPU',
        price: 900,
        stock: 4,
        isOnSale: true,
        cpuSpecs: { brand: 'AMD', socket: 'AM5' },
      },
      {
        category: 'CPU',
        price: 1200,
        stock: 0,
        isOnSale: false,
        cpuSpecs: { brand: 'Intel', socket: 'LGA 1700' },
      },
    ]);

    await expect(service.getFilterOptions({ category: 'CPU' })).resolves.toEqual(
      expect.objectContaining({
        cpuBrands: ['AMD', 'Intel'],
        sockets: ['AM5', 'LGA 1700'],
        priceRange: { min: 900, max: 1200 },
        inStockCount: 1,
        onSaleCount: 1,
        total: 2,
      }),
    );
  });
});
