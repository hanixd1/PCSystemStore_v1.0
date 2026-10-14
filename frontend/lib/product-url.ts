import { isValidProductSlug } from '@/lib/public-product';

export function getCanonicalProductPath(product: object): string {
  const slug = 'slug' in product && typeof product.slug === 'string' ? product.slug.trim() : '';
  return isValidProductSlug(slug) ? `/producto/${encodeURIComponent(slug)}` : '/tienda';
}

const LEGACY_SEARCH_MAX_WORDS = 6;

/** Search page for a term, in the same format the header search uses. */
export function getSearchPath(term: string): string {
  const encoded = encodeURIComponent(term);
  return `/categoria/${encoded}?search=${encoded}`;
}

/**
 * Old WooCommerce product URLs (/producto/<slug>) are still shared by customers.
 * Turns an unknown slug into a catalog search so they land on the closest products.
 */
export function getLegacyProductSearchPath(slug: string): string | null {
  const term = decodeURIComponentSafe(slug)
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter((word) => /^[\p{L}\p{N}.]+$/u.test(word))
    .slice(0, LEGACY_SEARCH_MAX_WORDS)
    .join(' ');
  return term.length >= 3 ? getSearchPath(term) : null;
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
