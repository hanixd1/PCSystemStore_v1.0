import { describe, expect, it } from 'vitest';
import { buildProductPayload, parseBooleanLike } from '../lib/productPayload';

describe('parseBooleanLike', () => {
  it.each([
    [true, true],
    ['si', true],
    ['YES', true],
    [1, true],
    [false, false],
    ['0', false],
    ['no', false],
  ])('normalizes %j to %j', (value, expected) => {
    expect(parseBooleanLike(value)).toBe(expected);
  });

  it('leaves unknown boolean-like values undefined', () => {
    expect(parseBooleanLike('enabled')).toBeUndefined();
  });
});

describe('buildProductPayload', () => {
  const baseProduct = {
    sku: 'MB-QA-001',
    name: 'Motherboard QA',
    description: 'Placa de prueba',
    category: 'MOTHERBOARD',
    price: '649.90',
    stock: 0,
  };

  it('preserves stock zero and technical array metadata', () => {
    const payload = buildProductPayload({
      ...baseProduct,
      isOnSale: 'false',
      salePrice: '',
      brand: 'QA',
      socket: 'AM5',
      formFactor: 'ATX',
      memoryType: 'DDR5',
      memorySlots: '4',
      m2Slots: '2',
      supportedM2FormFactors: ['2242', '2280'],
    });

    expect(payload).toMatchObject({
      stock: 0,
      isOnSale: false,
      salePrice: null,
      supportedM2FormFactors: ['2242', '2280'],
    });
  });

  it('keeps an active sale price and normalizes technical booleans', () => {
    const payload = buildProductPayload({
      ...baseProduct,
      category: 'RAM',
      isOnSale: 'true',
      salePrice: '499.90',
      memoryType: 'DDR5',
      capacity: '32',
      speed: '6000',
      modules: '2',
      hasRGB: 'false',
    });

    expect(payload).toMatchObject({
      isOnSale: true,
      salePrice: '499.90',
      hasRGB: false,
    });
  });

  it('omits empty optional specs but retains non-empty arrays', () => {
    const payload = buildProductPayload({
      ...baseProduct,
      category: 'CASE',
      isOnSale: false,
      supportedFormFactors: [],
      radiatorSupportMmValues: ['240', '360'],
      includesPsu: 'no',
      supportsTowerCooler: 'No',
    });

    expect(payload.supportedFormFactors).toBeUndefined();
    expect(payload.radiatorSupportMmValues).toEqual(['240', '360']);
    expect(payload.includesPsu).toBe(false);
    expect(payload.supportsTowerCooler).toBe(false);
  });

  it('keeps the no-radiator case selection without coercing its tower support', () => {
    const payload = buildProductPayload({
      ...baseProduct,
      category: 'CASE',
      brand: 'NZXT',
      supportedFormFactors: ['ATX'],
      maxGpuLength: '360',
      radiatorSupportMm: '0',
      radiatorSupportMmValues: ['0'],
      supportsTowerCooler: 'false',
    });

    expect(payload).toMatchObject({
      radiatorSupportMm: '0',
      radiatorSupportMmValues: ['0'],
      supportsTowerCooler: false,
    });
  });

  it('does not activate sales during product creation', () => {
    const payload = buildProductPayload(
      { ...baseProduct, isOnSale: true, salePrice: '499.90' },
      { mode: 'create' },
    );

    expect(payload).toMatchObject({ isOnSale: false, salePrice: null });
  });

  it.each([
    [
      'CPU',
      {
        cpuBrand: 'AMD',
        socket: 'AM5',
        baseTdpWatts: '65',
        tdp: '120',
        cores: '8',
        threads: '16',
        frequency: '5.2',
        integratedGraphics: 'true',
        includesCooler: 'false',
      },
    ],
    [
      'MOTHERBOARD',
      {
        brand: 'ASUS',
        socket: 'AM5',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        memorySlots: '4',
        m2Slots: '2',
        supportedM2FormFactors: ['2242', '2280'],
      },
    ],
    [
      'RAM',
      {
        brand: 'Kingston',
        memoryType: 'DDR5',
        capacity: '16',
        modules: '2',
        speed: '6000',
        latency: 'CL36',
        hasRGB: 'false',
      },
    ],
    [
      'GPU',
      {
        brand: 'ASUS',
        chipset: 'NVIDIA',
        vram: '12',
        typeVram: 'GDDR6X',
        length: '320',
        gpuPowerWatts: '285',
        recommendedPsuWatts: '750',
        fans: '3',
      },
    ],
    [
      'PSU',
      {
        brand: 'Corsair',
        wattage: '750',
        certification: '80 Plus Gold',
        modular: 'Full Modular',
        formFactor: 'ATX',
      },
    ],
    [
      'CASE',
      {
        brand: 'NZXT',
        supportedFormFactors: ['ATX', 'Micro ATX'],
        maxGpuLength: '365',
        includesPsu: 'false',
        supportsTowerCooler: 'true',
        includedFans: '3',
        radiatorSupportMmValues: ['240', '360'],
      },
    ],
    [
      'COOLER',
      {
        brand: 'DeepCool',
        type: 'Líquida',
        compatibleSockets: ['AM5', 'LGA1700'],
        tdpCapacity: '250',
        radiatorSize: '360',
        hasScreen: 'false',
        hasRGB: 'true',
      },
    ],
    [
      'STORAGE',
      {
        type: 'Sólido M.2',
        interface: 'PCIe 4.0',
        capacity: '1000',
        readSpeed: '7000',
        writeSpeed: '6500',
        m2FormFactor: '2280',
      },
    ],
  ])('keeps create/edit technical payload parity for %s', (category, specs) => {
    const formData = {
      ...baseProduct,
      category,
      sku: `${category}-QA-001`,
      isOnSale: false,
      ...specs,
    };

    expect(buildProductPayload(formData, { mode: 'create' })).toEqual(
      buildProductPayload(formData, { mode: 'edit' }),
    );
  });
});
