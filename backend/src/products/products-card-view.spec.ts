import { ProductsService } from './products.service';
import { ProductPricingService } from './services/product-pricing.service';

const product = {
  id: '1baee1e0-0f69-485d-b4f0-bb52a504aa58',
  sku: 'MON-1',
  slug: 'monitor-teros',
  name: 'Monitor Teros',
  description: 'Descripcion larga',
  category: 'MONITOR',
  price: 500,
  isOnSale: false,
  salePrice: null,
  stock: 3,
  images: ['https://res.cloudinary.com/demo/image/upload/v1/pcsystemstore/products/a.webp'],
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  monitorSpecs: { brand: 'Teros' },
};

function createService() {
  const prisma = {
    product: {
      findMany: jest.fn(async () => [product]),
      count: jest.fn(async () => 1),
    },
  };
  const service = new ProductsService(
    prisma as any,
    { log: jest.fn() } as any,
    new ProductPricingService(),
  );
  return { service, prisma };
}

describe('ProductsService listados livianos', () => {
  it('view=card pide solo los campos de la tarjeta, sin specs ni descripcion', async () => {
    const { service, prisma } = createService();

    await service.findAll({ view: 'card', limit: '24' });

    const args = (prisma.product.findMany.mock.calls[0] as any)[0];
    expect(args.include).toBeUndefined();
    expect(args.select).toMatchObject({ id: true, slug: true, price: true, images: true });
    expect(args.select).not.toHaveProperty('description');
    expect(args.select).not.toHaveProperty('monitorSpecs');
  });

  it('sin view=card mantiene la respuesta completa (builder, fichas)', async () => {
    const { service, prisma } = createService();

    await service.findAll({ limit: '24' });

    expect((prisma.product.findMany.mock.calls[0] as any)[0].include).toHaveProperty('cpuSpecs');
  });

  it('la busqueda con view=card rankea con specs pero devuelve solo la tarjeta', async () => {
    const { service } = createService();

    const result = await service.findAll({ view: 'card', search: 'monitor teros' });

    expect(result.items[0]).not.toHaveProperty('monitorSpecs');
    expect(result.items[0]).not.toHaveProperty('description');
    expect(result.items[0]).toMatchObject({ slug: 'monitor-teros' });
  });

  it('reutiliza las opciones de filtro 60 s por categoria', async () => {
    const { service, prisma } = createService();

    await service.getFilterOptions({ category: 'MONITOR' });
    await service.getFilterOptions({ category: 'MONITOR' });
    await service.getFilterOptions({ category: 'CPU' });

    expect(prisma.product.findMany).toHaveBeenCalledTimes(2);
  });
});
