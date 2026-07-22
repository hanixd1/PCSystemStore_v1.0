import {
  isPublicProductRecord,
  PUBLIC_PRODUCT_DATABASE_CRITERIA,
  withPublicProductCriteria,
} from './product-publication';

const completeProduct = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'AMD Ryzen 7 9700X',
  slug: 'amd-ryzen-7-9700x',
  price: '1499.90',
  stock: 3,
  category: 'CPU',
};

describe('public product publication policy', () => {
  it('allows optional description, images, brand and specifications to be absent', () => {
    expect(isPublicProductRecord(completeProduct)).toBe(true);
  });

  it.each([
    ['missing id', { id: null }],
    ['empty name', { name: '   ' }],
    ['missing slug', { slug: null }],
    ['invalid slug', { slug: 'producto/invalido' }],
    ['unknown category', { category: 'UNKNOWN' }],
    ['null price', { price: null }],
    ['zero price', { price: 0 }],
    ['NaN price', { price: 'not-a-number' }],
    ['negative stock', { stock: -1 }],
    ['fractional stock', { stock: 1.5 }],
  ])('rejects %s', (_label, override) => {
    expect(isPublicProductRecord({ ...completeProduct, ...override })).toBe(false);
  });

  it('adds the same minimum criteria without discarding an existing filter', () => {
    const where = withPublicProductCriteria({ category: 'CPU' });
    expect(where).toEqual({
      category: 'CPU',
      AND: [PUBLIC_PRODUCT_DATABASE_CRITERIA],
    });
  });
});
