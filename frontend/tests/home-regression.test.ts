import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StructuredData from '../components/StructuredData';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('home SSR regression protection', () => {
  it('keeps one accessible H1 without restoring the visible SEO section', () => {
    const page = source('app/page.tsx');

    expect(page.match(/<h1\b/g)).toHaveLength(1);
    expect(page).toContain('<h1 className="sr-only">');
    expect(page).toContain('Componentes, laptops y hardware para armar tu PC');
    expect(page).not.toContain('<section className="bg-gray-950');
    expect(page).not.toContain('Explora equipos y componentes para trabajo');
    expect(page).toContain('initialProducts={products}');
    expect(page).toContain('initialProcessors={buildHomeProcessorList(processors, 15)}');
    expect(page).toContain('initialBanners={banners}');
    expect(page).toContain('getHomeProcessors(60)');
  });

  it('renders structured data with the request nonce and safe JSON', () => {
    const markup = renderToStaticMarkup(
      createElement(StructuredData, {
        nonce: 'request-nonce',
        value: { name: '</script><script>alert(1)</script>' },
      }),
    );

    expect(markup).toContain('type="application/ld+json"');
    expect(markup).toContain('nonce="request-nonce"');
    expect(markup).not.toContain('nonce=""');
    expect(markup).not.toContain('</script><script>alert(1)');
    expect(source('components/StructuredData.tsx')).toContain('suppressHydrationWarning');
    expect(source('components/StructuredData.tsx')).not.toContain("'use client'");
  });

  it('keeps smooth-scroll intent explicit and removes the empty banner fallback', () => {
    const layout = source('app/layout.tsx');
    const hero = source('components/HeroCarousel.tsx');

    expect(layout).toContain('data-scroll-behavior="smooth"');
    expect(hero).toContain('if (banners.length === 0) return null;');
    expect(hero).not.toContain('fallbackBanners');
    expect(hero).not.toContain("api.get('/public/banners')");
  });
});
