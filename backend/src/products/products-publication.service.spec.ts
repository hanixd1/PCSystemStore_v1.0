import { ProductsService } from './products.service';
import { ProductPricingService } from './services/product-pricing.service';

const completeProduct = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  sku: 'CPU-9700X',
  name: 'AMD Ryzen 7 9700X',
  slug: 'amd-ryzen-7-9700x',
  price: 1499.9,
  stock: 3,
  category: 'CPU',
  images: [],
};

describe('ProductsService public publication policy', () => {
  const createService = (productResult: unknown) => {
    const prisma = {
      product: {
        findFirst: jest.fn(async () => productResult),
        findMany: jest.fn(async () => (Array.isArray(productResult) ? productResult : [])),
        count: jest.fn(async () => (Array.isArray(productResult) ? productResult.length : 0)),
      },
    };
    const service = new ProductsService(
      prisma as any,
      { log: jest.fn() } as any,
      new ProductPricingService(),
    );
    return { prisma, service };
  };

  it('returns a complete product even when optional fields are absent', async () => {
    const { service } = createService(completeProduct);
    await expect(service.findBySlug(completeProduct.slug)).resolves.toEqual(completeProduct);
  });

  it.each([
    ['missing slug', { slug: '' }],
    ['invalid price', { price: 0 }],
    ['invalid stock', { stock: -1 }],
    ['invalid category', { category: 'UNKNOWN' }],
  ])('does not expose a product with %s', async (_label, override) => {
    const { service } = createService({ ...completeProduct, ...override });
    await expect(service.findBySlug(completeProduct.slug)).resolves.toBeNull();
  });

  it('adds minimum database criteria to the public slug lookup', async () => {
    const { prisma, service } = createService(completeProduct);
    await service.findBySlug(completeProduct.slug);
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: completeProduct.slug,
          AND: expect.any(Array),
        }),
      }),
    );
  });
});
