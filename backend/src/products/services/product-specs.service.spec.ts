import { ProductSpecsService } from './product-specs.service';

describe('ProductSpecsService', () => {
  const service = new ProductSpecsService();

  it('builds CPU specs without coercing No to true', () => {
    expect(
      service.buildCreateProductSpecsPayload({
        category: 'CPU',
        cpuBrand: 'AMD',
        socket: 'AM5',
        cores: '8',
        threads: '16',
        tdp: '120',
        integratedGraphics: 'No',
        includesCooler: false,
      } as any),
    ).toEqual({
      cpuSpecs: {
        create: expect.objectContaining({
          brand: 'AMD',
          socket: 'AM5',
          cores: 8,
          threads: 16,
          tdp: 120,
          integratedGraphics: false,
          includesCooler: false,
        }),
      },
    });
  });

  it('updates only provided CPU fields and preserves false', () => {
    const currentProduct = {
      category: 'CPU',
      cpuSpecs: {
        brand: 'AMD',
        socket: 'AM5',
        integratedGraphics: true,
        includesCooler: true,
      },
    };

    expect(
      service.buildSpecUpdate(currentProduct, {
        integratedGraphics: false,
      } as any),
    ).toEqual({
      cpuSpecs: { update: { integratedGraphics: false } },
    });
  });

  it.each([
    [
      'GPU',
      { brand: 'ASUS', chipset: 'RTX 5070', vram: '12', length: '300', gpuPowerWatts: '250' },
      'gpuSpecs',
    ],
    [
      'RAM',
      { brand: 'Kingston', memoryType: 'DDR5', capacity: '16', speed: '6000', modules: '2' },
      'ramSpecs',
    ],
    [
      'PSU',
      { brand: 'Corsair', wattage: '750', certification: 'Gold', modular: 'Full Modular' },
      'psuSpecs',
    ],
    [
      'CASE',
      {
        brand: 'NZXT',
        supportedFormFactors: ['ATX'],
        maxGpuLength: '360',
        includesPsu: 'No',
        supportsTowerCooler: false,
        radiatorSupportMmValues: ['240', '360'],
      },
      'caseSpecs',
    ],
    [
      'COOLER',
      {
        brand: 'DeepCool',
        type: 'Líquida',
        compatibleSockets: ['AM5'],
        radiatorSize: '360',
        hasRGB: 'No',
      },
      'coolerSpecs',
    ],
    [
      'STORAGE',
      { type: 'Sólido M.2', capacity: '1000', interface: 'PCIe 4.0', m2FormFactor: '2280' },
      'storageSpecs',
    ],
  ])('builds the expected %s relation payload', (category, specs, relation) => {
    const payload = service.buildCreateProductSpecsPayload({ category, ...specs } as any);

    expect(payload).toHaveProperty(`${relation}.create`);
  });

  it('keeps case no-radiator and tower support values without legacy heights', () => {
    expect(
      service.buildCreateProductSpecsPayload({
        category: 'CASE',
        brand: 'NZXT',
        supportedFormFactors: ['ATX'],
        maxGpuLength: '360',
        includesPsu: 'No',
        supportsTowerCooler: false,
        radiatorSupportMmValues: ['0'],
      } as any),
    ).toEqual({
      caseSpecs: {
        create: expect.objectContaining({
          supportsTowerCooler: false,
          radiatorSupportMm: 0,
          radiatorSupportMmValues: ['0'],
        }),
      },
    });
  });

  it('defaults case tower cooler support to true when omitted', () => {
    expect(
      service.buildCreateProductSpecsPayload({
        category: 'CASE',
        brand: 'MSI',
        supportedFormFactors: ['ATX'],
        maxGpuLength: '340',
        includesPsu: 'No',
        radiatorSupportMmValues: ['240', '360'],
        includedFans: '3',
      } as any),
    ).toEqual({
      caseSpecs: {
        create: expect.objectContaining({
          supportsTowerCooler: true,
          radiatorSupportMm: 360,
          radiatorSupportMmValues: ['240', '360'],
        }),
      },
    });
  });
});
