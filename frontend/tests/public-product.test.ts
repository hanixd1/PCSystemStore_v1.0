import { describe, expect, it } from 'vitest';
import { normalizePublicProduct, normalizePublicProductList } from '../lib/public-product';
import { buildProductJsonLd, getProductDescription } from '../lib/product-seo';

const completeProduct = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'AMD Ryzen 7 9700X',
  slug: 'amd-ryzen-7-9700x',
  price: '1499.90',
  stock: 3,
  category: 'CPU',
  images: ['https://res.cloudinary.com/demo/image/upload/product.webp'],
  cpuSpecs: { brand: 'AMD' },
};

describe('public product normalization', () => {
  it('normalizes a complete product and optional legacy values safely', () => {
    const product = normalizePublicProduct({ ...completeProduct, description: null });
    expect(product).toMatchObject({ price: 1499.9, stock: 3, isOnSale: false });
    expect(getProductDescription(product!)).toContain('AMD Ryzen 7 9700X');
  });

  it.each([
    ['missing id', { id: null }],
    ['empty name', { name: '   ' }],
    ['missing slug', { slug: null }],
    ['invalid slug', { slug: 'producto/invalido' }],
    ['missing category', { category: null }],
    ['unknown category', { category: 'UNKNOWN' }],
    ['null price', { price: null }],
    ['NaN price', { price: 'NaN' }],
    ['zero price', { price: 0 }],
    ['negative stock', { stock: -1 }],
    ['inactive status', { status: 'INACTIVE' }],
  ])('does not publish %s', (_label, override) => {
    expect(normalizePublicProduct({ ...completeProduct, ...override })).toBeNull();
  });

  it('filters invalid products instead of creating invalid catalog links', () => {
    expect(
      normalizePublicProductList([
        completeProduct,
        { ...completeProduct, id: '223e4567-e89b-42d3-a456-426614174000', slug: null },
      ]),
    ).toHaveLength(1);
  });
});

describe('product JSON-LD', () => {
  it('omits absent optional fields and keeps a valid Offer', () => {
    const product = normalizePublicProduct({
      ...completeProduct,
      description: null,
      images: [],
      cpuSpecs: null,
      sku: null,
    });
    const value = buildProductJsonLd(product!);
    const serialized = JSON.stringify(value);

    expect(value).not.toHaveProperty('description');
    expect(value).not.toHaveProperty('brand');
    expect(value).not.toHaveProperty('image');
    expect(serialized).not.toMatch(/undefined|NaN|\[object Object\]/);
    expect(value.offers).toMatchObject({ price: '1499.90', priceCurrency: 'PEN' });
  });

  it('uses a valid sale only when it is positive and below the normal price', () => {
    const product = normalizePublicProduct({
      ...completeProduct,
      isOnSale: true,
      salePrice: 1200,
    });
    expect(buildProductJsonLd(product!).offers).toMatchObject({ price: '1200.00' });
  });
});
