import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from '../app/robots';
import { serializeJsonLd } from '../lib/json-ld';
import { getCanonicalProductPath } from '../lib/product-url';
import {
  categoryMetadata,
  organizationJsonLd,
  privateMetadata,
  publicPageMetadata,
} from '../lib/seo';
import { absoluteUrl, getSiteUrl, normalizeAbsoluteUrl } from '../lib/site-url';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('SEO URL helpers', () => {
  it('normalizes the configured public URL and builds absolute canonicals', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.pcsystemstore.com///');
    expect(getSiteUrl()).toBe('https://www.pcsystemstore.com');
    expect(absoluteUrl('/producto/ryzen-7')).toBe(
      'https://www.pcsystemstore.com/producto/ryzen-7',
    );
  });

  it('rejects invalid protocols and localhost in production', () => {
    expect(() => normalizeAbsoluteUrl('javascript:alert(1)')).toThrow(/http or https/);
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => normalizeAbsoluteUrl('http://localhost:3000')).toThrow(/localhost/);
  });

  it('never creates an ID or undefined product URL', () => {
    expect(getCanonicalProductPath({ slug: 'ryzen-7', id: '42' })).toBe('/producto/ryzen-7');
    expect(getCanonicalProductPath({ id: '42' })).toBe('/tienda');
    expect(getCanonicalProductPath({ slug: '   ' })).toBe('/tienda');
    expect(getCanonicalProductPath({ slug: 'producto/invalido' })).toBe('/tienda');
  });
});

describe('SEO metadata and robots policy', () => {
  it('publishes an absolute sitemap and excludes private routes', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.pcsystemstore.com');
    const value = robots();
    const rules = Array.isArray(value.rules) ? value.rules : [value.rules];
    const disallow = rules.flatMap((rule) => rule.disallow ?? []);

    expect(value.sitemap).toBe('https://www.pcsystemstore.com/sitemap.xml');
    expect(rules[0]?.allow).toBe('/');
    expect(disallow).toEqual(
      expect.arrayContaining(['/admin', '/auth', '/checkout', '/mi-cuenta', '/api/']),
    );
  });

  it('creates route-specific canonical metadata and private noindex metadata', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.pcsystemstore.com');
    expect(publicPageMetadata('Tienda', 'Catálogo', '/tienda').alternates?.canonical).toBe(
      'https://www.pcsystemstore.com/tienda',
    );
    expect(categoryMetadata('cpu')?.title).toEqual({
      absolute: 'Procesadores | PCSystemStore',
    });
    expect(categoryMetadata('inexistente')).toBeNull();
    expect(privateMetadata().robots).toMatchObject({ index: false, follow: false, nocache: true });
  });

  it('preserves a verified HTTPS branding logo without prefixing the site URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.pcsystemstore.com');
    const organization = organizationJsonLd(
      'PCSystemStore',
      'https://res.cloudinary.com/example/logo.webp',
    );
    expect(organization.logo).toBe('https://res.cloudinary.com/example/logo.webp');
  });
});

describe('JSON-LD serialization', () => {
  it('remains valid JSON and cannot close its script element', () => {
    const serialized = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
