import { describe, expect, it } from 'vitest';
import {
  applyFieldChange,
  changeCategory,
  createInitialFormData,
  mapProductToFormData,
  toggleArrayValue,
} from '../features/products/form/productFormState';
import { buildProductPayload } from '../lib/productPayload';
import { validateProductForm } from '../lib/products/validateProductForm';

describe('product form state rules', () => {
  it('keeps basic info when the category changes and resets the specs', () => {
    const typed = {
      ...createInitialFormData('CPU'),
      name: 'Ryzen 5 9600X',
      sku: 'CPU-1',
      price: '999',
      stock: '3',
      tdp: '105',
    };
    const next = changeCategory(typed, 'GPU');
    expect(next).toMatchObject({
      category: 'GPU',
      name: 'Ryzen 5 9600X',
      sku: 'CPU-1',
      price: '999',
    });
    expect(next.tdp).toBe('');
  });

  it('applies dependent field rules', () => {
    const cpu = createInitialFormData('CPU');
    expect(applyFieldChange(cpu, 'cpuBrand', 'Intel').socket).toBe('LGA 1200');
    expect(applyFieldChange(cpu, 'sku', 'pcs-cpu').sku).toBe('PCS-CPU');

    const storage = createInitialFormData('STORAGE');
    expect(applyFieldChange(storage, 'type', 'Sólido M.2')).toMatchObject({
      interface: 'PCIe 4.0',
      m2FormFactor: '2280',
    });

    const mouse = { ...createInitialFormData('MOUSE'), mouseType: 'Gamer', dpi: '26000' };
    expect(applyFieldChange(mouse, 'mouseType', 'Oficina').dpi).toBe('');

    const headset = createInitialFormData('HEADSET');
    const wireless = applyFieldChange(
      { ...headset, connection: 'Bluetooth', supportedConnections: ['Bluetooth'] },
      'connection',
      'Cableado',
    );
    expect(wireless.supportedConnections).toEqual(['USB']);
  });

  it('rejects negative numbers and negative text values', () => {
    const form = createInitialFormData('CPU');
    expect(applyFieldChange(form, 'price', '-5')).toBe(form);
    expect(applyFieldChange(form, 'frequency', '-4.2')).toBe(form);
    expect(applyFieldChange(form, 'price', '').price).toBe('');
  });

  it('treats "no radiator support" as exclusive', () => {
    const form = createInitialFormData('CASE');
    const with240 = toggleArrayValue(form, 'radiatorSupportMmValues', '240');
    expect(with240.radiatorSupportMmValues).toEqual(['240']);
    expect(
      toggleArrayValue(with240, 'radiatorSupportMmValues', '0').radiatorSupportMmValues,
    ).toEqual(['0']);
  });

  it('does not share array references between fresh forms', () => {
    const first = createInitialFormData('MONITOR');
    first.ports.push('HDMI');
    expect(createInitialFormData('MONITOR').ports).toEqual([]);
  });
});

describe('mapProductToFormData', () => {
  it('loads RGB from microphone and speaker specs', () => {
    const mic = mapProductToFormData({
      category: 'MICROPHONE',
      microphoneSpecs: { brand: 'Fifine', hasRGB: true },
    });
    expect(mic).toMatchObject({ brand: 'Fifine', hasRGB: 'true' });
    expect(
      mapProductToFormData({ category: 'SPEAKER', speakerSpecs: { hasRGB: true } }).hasRGB,
    ).toBe('true');
  });

  it('normalizes legacy headset connections to backend-accepted options', () => {
    const form = mapProductToFormData({
      category: 'HEADSET',
      headsetSpecs: { supportedConnections: ['Cable USB', 'Jack 3.5 mm'] },
    });
    expect(form.supportedConnections).toEqual(['USB', 'Jack 3.5mm']);
  });

  it('loads software license data so it can be edited', () => {
    const form = mapProductToFormData({
      category: 'SOFTWARE',
      softwareSpecs: { licenseType: 'OEM', platform: 'Mac' },
    });
    expect(form).toMatchObject({ licenseType: 'OEM', platform: 'Mac' });
  });

  it('round-trips a stored product into a valid edit payload', () => {
    const form = mapProductToFormData({
      sku: 'CS-4630305',
      name: 'CASE MICRONICS MEGATRON MIC GFC1003W WHITE',
      description: 'Gabinete ATX con 7 ventiladores ARGB.',
      category: 'CASE',
      price: 210,
      stock: 20,
      caseSpecs: {
        brand: 'Micronics',
        supportedFormFactors: ['ATX', 'Micro-ATX'],
        maxGpuLength: 380,
        includedFans: 7,
        radiatorSupportMmValues: ['240', '360'],
        supportsTowerCooler: true,
      },
    });
    expect(validateProductForm(form, { buildPayload: buildProductPayload })).toBeNull();
    expect(buildProductPayload(form)).toMatchObject({
      brand: 'Micronics',
      supportedFormFactors: ['ATX', 'Micro-ATX'],
      radiatorSupportMmValues: ['240', '360'],
    });
  });
});

describe('power protection categories', () => {
  const base = {
    sku: 'UPS-CDP-600',
    name: 'UPS CDP R-UPR608 600VA',
    description: 'UPS interactivo de 600VA con 8 tomas.',
    price: '199',
    stock: '5',
  };

  it.each(['UPS', 'STABILIZER'])('sends brand, outlets and watts for %s', (category) => {
    const form = { ...createInitialFormData(category), ...base, brand: 'CDP', wattage: '360' };
    expect(validateProductForm(form, { buildPayload: buildProductPayload })).toBeNull();
    expect(buildProductPayload(form)).toMatchObject({
      category,
      brand: 'CDP',
      outletType: 'Solo tomas de corriente',
      wattage: '360',
    });
  });

  it('requires the supported watts', () => {
    const form = { ...createInitialFormData('STABILIZER'), ...base, brand: 'Forza' };
    expect(validateProductForm(form, { buildPayload: buildProductPayload })).toBe(
      'Ingresa los watts que soporta el equipo del estabilizador.',
    );
  });

  it('loads stored power protection specs', () => {
    const form = mapProductToFormData({
      category: 'UPS',
      powerProtectionSpecs: {
        brand: 'Forza',
        outletType: 'Tomas de corriente + USB',
        wattage: 500,
      },
    });
    expect(form).toMatchObject({
      brand: 'Forza',
      outletType: 'Tomas de corriente + USB',
      wattage: '500',
    });
  });
});

describe('cpu integrated graphics guard', () => {
  it('rejects F models marked with integrated graphics', () => {
    const form = {
      ...createInitialFormData('CPU'),
      sku: 'CPU-I5-12400F',
      name: 'PROCESADOR INTEL CORE I5-12400F',
      description: 'Procesador Intel de 12va generacion.',
      price: '600',
      stock: '4',
      cpuBrand: 'Intel',
      socket: 'LGA 1700',
      tdp: '65',
      integratedGraphics: 'true',
    };
    expect(validateProductForm(form, { cpuSocketsByBrand: { Intel: ['LGA 1700'] } })).toMatch(
      /modelo F\/KF no tienen gráficos integrados/,
    );
  });
});
