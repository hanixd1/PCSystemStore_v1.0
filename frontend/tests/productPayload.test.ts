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
    });

    expect(payload.supportedFormFactors).toBeUndefined();
    expect(payload.radiatorSupportMmValues).toEqual(['240', '360']);
    expect(payload.includesPsu).toBe(false);
  });

  it('does not activate sales during product creation', () => {
    const payload = buildProductPayload(
      { ...baseProduct, isOnSale: true, salePrice: '499.90' },
      { mode: 'create' },
    );

    expect(payload).toMatchObject({ isOnSale: false, salePrice: null });
  });
});
