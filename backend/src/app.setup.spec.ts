import { shouldDisableStorefrontCaching } from './app.setup';

describe('storefront cache policy', () => {
  it.each([
    ['/products', true],
    ['/products/123e4567-e89b-42d3-a456-426614174000', true],
    ['/products/slug/producto', true],
    ['/builder/cpus', true],
    ['/public/branding', true],
    ['/public/banners', true],
    ['/version', true],
    ['/health', false],
    ['/orders', false],
  ])('classifies GET %s', (path, expected) => {
    expect(shouldDisableStorefrontCaching('GET', path)).toBe(expected);
  });

  it('does not add storefront cache headers to mutation responses', () => {
    expect(shouldDisableStorefrontCaching('POST', '/products')).toBe(false);
    expect(shouldDisableStorefrontCaching('PATCH', '/products/product-id')).toBe(false);
  });
});
