import { describe, expect, it } from 'vitest';
import { getDiscountPercent, getEffectivePrice, isSaleActive } from '../lib/pricing';

describe('pricing', () => {
  it('uses the regular price when an offer is disabled, without requiring a sale price', () => {
    const product = { price: '1200', isOnSale: false, salePrice: null };

    expect(isSaleActive(product)).toBe(false);
    expect(getEffectivePrice(product)).toBe(1200);
    expect(getDiscountPercent(product)).toBe(0);
  });

  it('accepts a valid active offer expressed with form string values', () => {
    const product = { price: '1200', isOnSale: 'true', salePrice: '900' };

    expect(isSaleActive(product)).toBe(true);
    expect(getEffectivePrice(product)).toBe(900);
    expect(getDiscountPercent(product)).toBe(25);
  });

  it.each([
    { price: 1200, isOnSale: true, salePrice: null },
    { price: 1200, isOnSale: true, salePrice: 0 },
    { price: 1200, isOnSale: true, salePrice: 1200 },
    { price: 1200, isOnSale: true, salePrice: 1500 },
  ])('does not activate invalid offers: %o', (product) => {
    expect(isSaleActive(product)).toBe(false);
    expect(getEffectivePrice(product)).toBe(1200);
    expect(getDiscountPercent(product)).toBe(0);
  });
});
