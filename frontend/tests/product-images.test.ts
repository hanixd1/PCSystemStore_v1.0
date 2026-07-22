import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PRODUCT_IMAGE_FALLBACK,
  getProductPrimaryImage,
  resolveImageUrl,
} from '../lib/product-images';

describe('resolveImageUrl', () => {
  it('ships the configured fallback in public', () => {
    expect(existsSync(resolve(process.cwd(), `public${PRODUCT_IMAGE_FALLBACK}`))).toBe(true);
  });

  it('preserves a valid HTTPS Cloudinary URL', () => {
    expect(
      resolveImageUrl('https://res.cloudinary.com/pcsystemstore/image/upload/v1/product.webp'),
    ).toBe('https://res.cloudinary.com/pcsystemstore/image/upload/v1/product.webp');
  });

  it('upgrades Cloudinary HTTP URLs, whose host is known to support HTTPS', () => {
    expect(
      resolveImageUrl('http://res.cloudinary.com/pcsystemstore/image/upload/product.webp'),
    ).toBe('https://res.cloudinary.com/pcsystemstore/image/upload/product.webp');
  });

  it('accepts local public paths and legacy public upload paths', () => {
    expect(resolveImageUrl('/uploads/product.webp')).toBe('/uploads/product.webp');
    expect(resolveImageUrl('uploads/product.webp')).toBe('/uploads/product.webp');
    expect(resolveImageUrl('blob:https://pcsystemstore.test/preview-id')).toBe(
      'blob:https://pcsystemstore.test/preview-id',
    );
  });

  it.each([null, undefined, '', '   ', { url: 'https://example.com/image.webp' }])(
    'uses the existing local fallback for invalid input (%j)',
    (value) => {
      expect(resolveImageUrl(value)).toBe(PRODUCT_IMAGE_FALLBACK);
    },
  );

  it('uses a configured API origin for non-public relative backend paths', () => {
    expect(
      resolveImageUrl('images/legacy-product.webp', { apiBaseUrl: 'https://api.example.test/v1' }),
    ).toBe('https://api.example.test/images/legacy-product.webp');
  });

  it.each([
    'javascript:alert(1)',
    'file:///tmp/product.webp',
    'data:text/html;base64,PHNjcmlwdD4=',
  ])('rejects an unsafe protocol (%s)', (value) => {
    expect(resolveImageUrl(value)).toBe(PRODUCT_IMAGE_FALLBACK);
  });

  it('reads the secure_url shape returned by Cloudinary-compatible APIs', () => {
    expect(
      getProductPrimaryImage({
        images: [
          { secure_url: 'https://res.cloudinary.com/pcsystemstore/image/upload/product.webp' },
        ],
      }),
    ).toBe('https://res.cloudinary.com/pcsystemstore/image/upload/product.webp');
  });
});
