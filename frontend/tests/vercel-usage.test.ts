import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';
import { config as proxyConfig } from '../proxy';
import { getLegacyProductSearchPath } from '../lib/product-url';
import { normalizePublicProduct, toProductCard } from '../lib/public-product';
import { SLUG_TO_CATEGORY } from '../lib/products/productFiltersConfig';
import { CATEGORY_SEO } from '../lib/seo';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('home product cards', () => {
  it('keeps only the fields the cards and cart need', () => {
    const product = normalizePublicProduct({
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'AMD Ryzen 5 9600X',
      slug: 'amd-ryzen-5-9600x',
      category: 'CPU',
      price: 999,
      salePrice: 899,
      isOnSale: true,
      stock: 4,
      images: ['https://res.cloudinary.com/a.webp', 'https://res.cloudinary.com/b.webp'],
      description: 'Procesador de 6 núcleos.',
      cpuSpecs: { brand: 'AMD', socket: 'AM5' },
    })!;

    expect(toProductCard(product)).toEqual({
      id: '123e4567-e89b-42d3-a456-426614174000',
      slug: 'amd-ryzen-5-9600x',
      name: 'AMD Ryzen 5 9600X',
      category: 'CPU',
      price: 999,
      isOnSale: true,
      salePrice: 899,
      stock: 4,
      images: ['https://res.cloudinary.com/a.webp'],
    });
  });
});

describe('legacy store URLs', () => {
  it('turns old WooCommerce product slugs into a catalog search', () => {
    expect(getLegacyProductSearchPath('placa-gigabyte-b550m-ds3h-am4')).toBe(
      '/categoria/placa%20gigabyte%20b550m%20ds3h%20am4?search=placa%20gigabyte%20b550m%20ds3h%20am4',
    );
    expect(
      getLegacyProductSearchPath(
        'monitor-msi-mag-g242l-e14-23-8-144hz-plano-fhd-rapid-ips-0-5ms-headphone-out',
      ),
    ).toContain('search=monitor%20msi%20mag%20g242l%20e14%2023');
    expect(getLegacyProductSearchPath('x')).toBeNull();
    expect(getLegacyProductSearchPath('%E0%A4%A')).toBeNull();
  });

  it('redirects old category and cart URLs without invoking a function', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/categoria-producto/procesadores',
          destination: '/categoria/cpu',
        }),
        expect.objectContaining({ source: '/cart', destination: '/', permanent: true }),
        expect.objectContaining({ source: '/carrito', destination: '/', permanent: true }),
      ]),
    );
    expect(source('app/builder/page.tsx')).not.toContain("'/carrito'");
  });
});

describe('proxy matcher', () => {
  const matches = (path: string) =>
    proxyConfig.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(path));

  it('runs for pages and SVG files', () => {
    for (const path of ['/', '/producto/amd-ryzen-5-9600x', '/admin/inventario', '/file.svg']) {
      expect(matches(path)).toBe(true);
    }
  });

  it('skips static files that need no CSP nonce', () => {
    for (const path of [
      '/_next/static/chunks/app.js',
      '/chatbot.png',
      '/payment-methods.png',
      '/apple-touch-icon-precomposed.png',
      '/robots.txt',
      '/sitemap.xml',
      '/PRODUCTO/254-1.jpg',
    ]) {
      expect(matches(path)).toBe(false);
    }
  });
});

describe('prefetch of dynamic routes', () => {
  it('does not prefetch admin links', () => {
    for (const path of ['app/admin/inventario/page.tsx', 'components/AdminLayoutClient.tsx']) {
      const file = source(path);
      expect(file.match(/<Link\b/g)?.length).toBe(file.match(/prefetch=\{false\}/g)?.length);
    }
  });
});

describe('category menu links', () => {
  it('only links to category pages the server and the client can resolve', () => {
    const hrefs = [
      ...source('components/MegaMenu.tsx').matchAll(/href: '\/categoria\/([^'?]+)/g),
    ].map((match) => match[1].toLowerCase());
    expect(hrefs.length).toBeGreaterThan(20);
    for (const slug of hrefs) {
      expect(CATEGORY_SEO[slug], slug).toBeDefined();
    }
    for (const slug of ['ddr4', 'ddr5', 'pc-gaming', 'software']) {
      expect(SLUG_TO_CATEGORY[slug], slug).toBeDefined();
    }
  });
});
