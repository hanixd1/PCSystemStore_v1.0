import { ProductsService } from './products.service';
import { ProductPricingService } from './services/product-pricing.service';

function product(overrides: Record<string, unknown>) {
  return {
    id: 'product-id',
    slug: 'producto-qa',
    name: 'Producto QA',
    price: 100,
    category: 'CPU',
    stock: 5,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    cpuSpecs: null,
    motherboardSpecs: null,
    ramSpecs: null,
    gpuSpecs: null,
    psuSpecs: null,
    caseSpecs: null,
    coolerSpecs: null,
    storageSpecs: null,
    ...overrides,
  };
}

function createService(currentProduct: any, candidates: any[]) {
  const prisma = {
    product: {
      findUnique: jest.fn(async () => currentProduct),
      findMany: jest.fn(async () => candidates),
    },
  };
  const audit = { log: jest.fn() };

  return {
    service: new ProductsService(prisma as any, audit as any, new ProductPricingService()),
    prisma,
  };
}

describe('ProductsService productos relacionados tecnicos', () => {
  it('prioriza placas AM5 y CPU AMD AM5 para un procesador AMD AM5', async () => {
    const current = product({
      id: 'cpu-amd',
      name: 'AMD Ryzen 5',
      category: 'CPU',
      cpuSpecs: { brand: 'AMD', socket: 'AM5' },
    });
    const candidates = [
      product({
        id: 'cpu-intel',
        name: 'Intel Core i5',
        category: 'CPU',
        cpuSpecs: { brand: 'Intel', socket: 'LGA1851' },
      }),
      product({
        id: 'mb-am5',
        name: 'Motherboard AM5',
        category: 'MOTHERBOARD',
        motherboardSpecs: { socket: 'AM5', memoryType: 'DDR5' },
      }),
      product({
        id: 'cpu-amd-2',
        name: 'AMD Ryzen 7',
        category: 'CPU',
        cpuSpecs: { brand: 'AMD', socket: 'AM5' },
      }),
    ];
    const { service } = createService(current, candidates);

    const related = await service.findRelated('cpu-amd');

    expect(related.map((item) => item.id).slice(0, 2)).toEqual(['mb-am5', 'cpu-amd-2']);
    expect(related.some((item) => item.id === 'cpu-intel')).toBe(false);
  });

  it('prioriza placas LGA1851 y CPU Intel para un procesador Intel LGA1851', async () => {
    const current = product({
      id: 'cpu-intel',
      name: 'Intel Core Ultra',
      category: 'CPU',
      cpuSpecs: { brand: 'Intel', socket: 'LGA1851' },
    });
    const candidates = [
      product({
        id: 'cpu-amd',
        name: 'AMD Ryzen 5',
        category: 'CPU',
        cpuSpecs: { brand: 'AMD', socket: 'AM5' },
      }),
      product({
        id: 'mb-lga1851',
        name: 'Motherboard LGA1851',
        category: 'MOTHERBOARD',
        motherboardSpecs: { socket: 'LGA1851', memoryType: 'DDR5' },
      }),
      product({
        id: 'cpu-intel-2',
        name: 'Intel Core i7',
        category: 'CPU',
        cpuSpecs: { brand: 'Intel', socket: 'LGA1851' },
      }),
    ];
    const { service } = createService(current, candidates);

    const related = await service.findRelated('cpu-intel');

    expect(related.map((item) => item.id)).toEqual(['mb-lga1851', 'cpu-intel-2']);
    expect(related.some((item) => item.id === 'cpu-amd')).toBe(false);
  });

  it('para motherboard AM5 DDR5 devuelve CPU AM5 y RAM DDR5, no RAM DDR4 principal', async () => {
    const current = product({
      id: 'mb-am5',
      category: 'MOTHERBOARD',
      motherboardSpecs: { socket: 'AM5', memoryType: 'DDR5' },
    });
    const candidates = [
      product({
        id: 'ram-ddr4',
        category: 'RAM',
        ramSpecs: { memoryType: 'DDR4' },
      }),
      product({
        id: 'ram-ddr5',
        category: 'RAM',
        ramSpecs: { memoryType: 'DDR5' },
      }),
      product({
        id: 'cpu-am5',
        category: 'CPU',
        cpuSpecs: { socket: 'AM5', brand: 'AMD' },
      }),
    ];
    const { service } = createService(current, candidates);

    const related = await service.findRelated('mb-am5');

    expect(related.map((item) => item.id)).toEqual(['cpu-am5', 'ram-ddr5']);
    expect(related.some((item) => item.id === 'ram-ddr4')).toBe(false);
  });

  it('para motherboard LGA1851 DDR5 devuelve CPU LGA1851 y no CPU AMD', async () => {
    const current = product({
      id: 'mb-lga1851',
      category: 'MOTHERBOARD',
      motherboardSpecs: { socket: 'LGA1851', memoryType: 'DDR5' },
    });
    const candidates = [
      product({
        id: 'cpu-amd',
        category: 'CPU',
        cpuSpecs: { socket: 'AM5', brand: 'AMD' },
      }),
      product({
        id: 'cpu-intel',
        category: 'CPU',
        cpuSpecs: { socket: 'LGA1851', brand: 'Intel' },
      }),
      product({
        id: 'ram-ddr5',
        category: 'RAM',
        ramSpecs: { memoryType: 'DDR5' },
      }),
    ];
    const { service } = createService(current, candidates);

    const related = await service.findRelated('mb-lga1851');

    expect(related.map((item) => item.id)).toEqual(['cpu-intel', 'ram-ddr5']);
    expect(related.some((item) => item.id === 'cpu-amd')).toBe(false);
  });

  it('si CPU AMD AM5 tiene pocos compatibles no rellena con Intel', async () => {
    const current = product({
      id: 'cpu-amd',
      category: 'CPU',
      cpuSpecs: { brand: 'AMD', socket: 'AM5' },
    });
    const candidates = [
      product({
        id: 'mb-am5',
        category: 'MOTHERBOARD',
        motherboardSpecs: { socket: 'AM5', memoryType: 'DDR5' },
      }),
      product({
        id: 'cpu-intel',
        category: 'CPU',
        cpuSpecs: { brand: 'Intel', socket: 'LGA1851' },
      }),
    ];
    const { service } = createService(current, candidates);

    const related = await service.findRelated('cpu-amd');

    expect(related.map((item) => item.id)).toEqual(['mb-am5']);
  });

  it('para almacenamiento Sólido M.2 2280 devuelve motherboards compatibles con 2280', async () => {
    const current = product({
      id: 'ssd-m2',
      category: 'STORAGE',
      storageSpecs: { type: 'Sólido M.2', interface: 'PCIe 4.0', m2FormFactor: '2280' },
    });
    const candidates = [
      product({
        id: 'mb-2242',
        category: 'MOTHERBOARD',
        motherboardSpecs: { supportedM2FormFactors: ['2242'] },
      }),
      product({
        id: 'mb-2280',
        category: 'MOTHERBOARD',
        motherboardSpecs: { supportedM2FormFactors: ['2280', '22110'] },
      }),
    ];
    const { service } = createService(current, candidates);

    const related = await service.findRelated('ssd-m2');

    expect(related.map((item) => item.id)).toEqual(['mb-2280']);
  });
});

describe('ProductsService normalizacion defensiva de relacionados', () => {
  it('no recomienda Intel para un Ryzen AM5 aunque el producto venga con categoria/specs alternativos', async () => {
    const current = product({
      id: 'cpu-amd',
      name: 'PROCESADOR AMD RYZEN 7 8700G 4.20 / 5.10 GHZ 16MB AM5',
      category: 'Procesador',
      cpuSpecs: null,
      specs: { marcaProcesador: 'AMD', socket: 'AM5' },
    });
    const candidates = [
      product({
        id: 'cpu-intel',
        name: 'PROCESADOR INTEL CORE ULTRA 9',
        category: 'CPU',
        cpuSpecs: { brand: 'Intel', socket: 'LGA1851' },
      }),
      product({
        id: 'mb-am5',
        name: 'Placa madre AM5 DDR5',
        category: 'MOTHERBOARD',
        motherboardSpecs: { socket: 'AM5', memoryType: 'DDR5' },
      }),
      product({
        id: 'cpu-amd-2',
        name: 'AMD Ryzen 5 7600',
        category: 'CPU',
        cpuSpecs: { brand: 'AMD', socket: 'AM5' },
      }),
      product({
        id: 'ram-ddr5',
        name: 'RAM DDR5',
        category: 'RAM',
        ramSpecs: { memoryType: 'DDR5' },
      }),
    ];
    const { service } = createService(current, candidates);

    const related = await service.findRelated('cpu-amd');

    expect(related.map((item) => item.id)).toEqual(['mb-am5', 'cpu-amd-2', 'ram-ddr5']);
    expect(related.some((item) => item.id === 'cpu-intel')).toBe(false);
  });
});

describe('ProductsService fallback de relacionados', () => {
  it('devuelve fallback como array cuando no hay compatibles estrictos', async () => {
    const current = product({
      id: 'cpu-amd',
      name: 'AMD Ryzen AM5',
      category: 'CPU',
      cpuSpecs: { brand: 'AMD', socket: 'AM5' },
    });
    const candidates = [
      product({
        id: 'cpu-intel',
        name: 'Intel Core LGA1851',
        category: 'CPU',
        cpuSpecs: { brand: 'Intel', socket: 'LGA1851' },
      }),
    ];
    const { service } = createService(current, candidates);

    const related = await service.findRelated('cpu-amd');

    expect(Array.isArray(related)).toBe(true);
    expect(related.map((item) => item.id)).toEqual(['cpu-intel']);
  });
});
