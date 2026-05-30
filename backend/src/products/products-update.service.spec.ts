import { ProductsService } from './products.service';
import { ProductPricingService } from './services/product-pricing.service';
import { parseBooleanLike } from '../common/dto/transformers';

function createCpuProduct(overrides: Partial<any> = {}) {
  return {
    id: 'cpu-1',
    sku: 'CPU-QA-1',
    slug: 'cpu-qa-1',
    name: 'AMD Ryzen QA 9600X',
    description: 'Procesador QA para pruebas de actualizacion',
    price: 1000,
    salePrice: null,
    isOnSale: false,
    stock: 10,
    category: 'CPU',
    images: ['cpu.png'],
    cpuSpecs: {
      id: 'cpu-spec-1',
      productId: 'cpu-1',
      brand: 'AMD',
      socket: 'AM5',
      cores: 6,
      threads: 12,
      frequency: '3.9;5.4',
      baseTdpWatts: 65,
      tdp: 105,
      integratedGraphics: true,
      includesCooler: true,
    },
    ...overrides,
  };
}

function createService(currentProduct: any) {
  const prisma = {
    product: {
      findUnique: jest.fn(async () => currentProduct),
      update: jest.fn(async ({ data }) => ({
        ...currentProduct,
        ...data,
        cpuSpecs: {
          ...currentProduct.cpuSpecs,
          ...(data.cpuSpecs?.update ?? {}),
        },
      })),
    },
  };

  return {
    service: new ProductsService(
      prisma as any,
      { log: jest.fn(async (args) => args) } as any,
      new ProductPricingService(),
    ),
    prisma,
  };
}

describe('ProductsService update specs', () => {
  it.each([
    ['No', false],
    ['NO', false],
    ['false', false],
    [false, false],
    ['0', false],
    [0, false],
    ['Sí', true],
    ['Si', true],
    ['true', true],
    [true, true],
    ['1', true],
    [1, true],
  ])('normaliza valores booleanos tipo %p como %p', (input, expected) => {
    expect(parseBooleanLike(input)).toBe(expected);
  });

  it('persiste integratedGraphics e includesCooler de true a false', async () => {
    const { service, prisma } = createService(createCpuProduct());

    await service.update('cpu-1', {
      integratedGraphics: false,
      includesCooler: false,
    });

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cpuSpecs: {
            update: expect.objectContaining({
              integratedGraphics: false,
              includesCooler: false,
            }),
          },
        }),
      }),
    );
  });

  it('persiste strings No/false como false en campos booleanos de CPU', async () => {
    const { service, prisma } = createService(createCpuProduct());

    await service.update('cpu-1', {
      integratedGraphics: 'No',
      includesCooler: 'false',
    } as any);

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cpuSpecs: {
            update: expect.objectContaining({
              integratedGraphics: false,
              includesCooler: false,
            }),
          },
        }),
      }),
    );
  });

  it('persiste integratedGraphics e includesCooler de false a true', async () => {
    const { service, prisma } = createService(
      createCpuProduct({
        cpuSpecs: {
          ...createCpuProduct().cpuSpecs,
          integratedGraphics: false,
          includesCooler: false,
        },
      }),
    );

    await service.update('cpu-1', {
      integratedGraphics: true,
      includesCooler: true,
    });

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cpuSpecs: {
            update: expect.objectContaining({
              integratedGraphics: true,
              includesCooler: true,
            }),
          },
        }),
      }),
    );
  });
});
