import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalRedirectUrl, requiresNoStore } from '../proxy';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('canonical production host policy', () => {
  it.each([
    'https://pcsystemstore.com/ofertas?ref=legacy',
    'https://pcsystemstore.com.pe/ofertas?ref=legacy',
    'https://www.pcsystemstore.com.pe/ofertas?ref=legacy',
    'https://pc-system-store-frontend.vercel.app/ofertas?ref=legacy',
  ])('redirects %s to the current canonical host', (input) => {
    expect(canonicalRedirectUrl(new URL(input), true)?.toString()).toBe(
      'https://www.pcsystemstore.com/ofertas?ref=legacy',
    );
  });

  it('upgrades the canonical host to HTTPS without hijacking preview domains', () => {
    expect(
      canonicalRedirectUrl(new URL('http://www.pcsystemstore.com/tienda'), true)?.toString(),
    ).toBe('https://www.pcsystemstore.com/tienda');
    expect(canonicalRedirectUrl(new URL('https://preview.vercel.app/tienda'), true)).toBeNull();
    expect(canonicalRedirectUrl(new URL('https://pcsystemstore.com/tienda'), false)).toBeNull();
  });

  it('uses the forwarded host supplied by the proxy/CDN', () => {
    expect(
      canonicalRedirectUrl(
        new URL('http://127.0.0.1:3207/ofertas'),
        true,
        'https',
        'www.pcsystemstore.com.pe',
      )?.toString(),
    ).toBe('https://www.pcsystemstore.com/ofertas');
  });
});

describe('storefront cache retirement policy', () => {
  it.each([
    '/',
    '/categoria/componentes',
    '/product/123',
    '/producto/ryzen-7',
    '/tienda',
    '/ofertas',
    '/armar-pc',
    '/builder',
    '/checkout',
    '/mi-cuenta',
    '/admin',
    '/auth/login',
    '/api/products',
    '/sitemap.xml',
  ])('marks %s as no-store', (path) => {
    expect(requiresNoStore(path)).toBe(true);
  });

  it('does not apply dynamic-page cache policy to immutable assets', () => {
    expect(requiresNoStore('/_next/static/chunks/app.js')).toBe(false);
    expect(requiresNoStore('/icon.png')).toBe(false);
  });

  it('keeps product detail and browser reads uncached with only a short server list cache', () => {
    expect(source('lib/catalog-server.ts')).toContain("cache: 'no-store'");
    expect(source('lib/catalog-server.ts')).toContain('revalidate: 15');
    expect(source('lib/catalog-server.ts')).not.toMatch(/revalidate:\s*(?:[6-9]\d|\d{3,})/);
    expect(source('lib/public-api.ts')).toContain("cache: 'no-store'");
    expect(source('lib/public-api.ts')).toContain('_pcss_fresh');
  });

  it('persists only cart and builder references, not catalog snapshots', () => {
    const cart = source('components/CartHydrator.tsx');
    const builder = source('app/builder/page.tsx');

    expect(cart).toContain('CART_STORAGE_VERSION = 2');
    expect(cart).toContain('fetchFreshPublicJson<unknown>');
    expect(cart).toContain('id: item.id');
    expect(builder).toContain('BUILDER_STORAGE_VERSION = 2');
    expect(builder).toContain('selectedProductIds');
    expect(builder).toContain('fetchAllFreshPublicProducts');
  });

  it('ships retirement scripts and runtime cleanup for legacy service workers', () => {
    expect(source('public/sw.js')).toContain('registration.unregister()');
    expect(source('public/service-worker.js')).toContain('registration.unregister()');
    expect(source('components/RuntimeMaintenance.tsx')).toContain(
      'navigator.serviceWorker.getRegistrations()',
    );
    expect(source('components/RuntimeMaintenance.tsx')).toContain('window.location.reload()');
    expect(source('public/sw.js')).toContain('client.navigate(client.url)');
    expect(source('public/service-worker.js')).toContain('client.navigate(client.url)');
  });
});
