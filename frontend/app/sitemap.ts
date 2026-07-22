import type { MetadataRoute } from 'next';
import { getAllPublicProducts } from '@/lib/catalog-server';
import { getCanonicalProductPath } from '@/lib/product-url';
import { CATEGORY_SEO, PUBLIC_STATIC_ROUTES } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_STATIC_ROUTES.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === '/' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : path === '/ofertas' ? 0.8 : 0.6,
  }));
  const categoryEntries: MetadataRoute.Sitemap = Object.keys(CATEGORY_SEO).map((slug) => ({
    url: absoluteUrl(`/categoria/${slug}`), changeFrequency: 'weekly', priority: 0.7,
  }));
  const products = await getAllPublicProducts();
  const productEntries: MetadataRoute.Sitemap = products.map((product) => {
    const updatedAt = product.updatedAt ? new Date(product.updatedAt) : null;
    return {
      url: absoluteUrl(getCanonicalProductPath(product)),
      ...(updatedAt && !Number.isNaN(updatedAt.getTime()) ? { lastModified: updatedAt } : {}),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    };
  });

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
