import { isValidProductSlug } from '@/lib/public-product';

export function getCanonicalProductPath(product: object): string {
  const slug =
    'slug' in product && typeof product.slug === 'string' ? product.slug.trim() : '';
  return isValidProductSlug(slug) ? `/producto/${encodeURIComponent(slug)}` : '/tienda';
}
