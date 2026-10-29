import { cache } from 'react';
import { API_URL } from '@/lib/api';
import {
  isValidProductSlug,
  normalizePublicProduct,
  normalizePublicProductList,
  type PublicProduct,
} from '@/lib/public-product';

export type { PublicProduct } from '@/lib/public-product';

/**
 * Server-side reads (SSR, sitemap) go through Railway's private network when INTERNAL_API_URL is
 * set (`http://<backend>.railway.internal:<PORT>`): no public egress is billed for them. It is a
 * server-only variable, never inlined in the browser bundle; browsers keep NEXT_PUBLIC_API_URL.
 */
const SERVER_API_URL = process.env.INTERNAL_API_URL?.trim().replace(/\/$/, '') || API_URL;

type ProductPageResponse = {
  items?: PublicProduct[];
  total?: number;
  totalPages?: number;
};

type PublicServerFetchOptions = {
  throwOnUnavailable?: boolean;
  revalidate?: number;
};

async function fetchPublicJson<T>(
  path: string,
  options: PublicServerFetchOptions = {},
): Promise<T | null> {
  const { throwOnUnavailable = false, revalidate } = options;
  if (!SERVER_API_URL) {
    const message = `API unavailable: NEXT_PUBLIC_API_URL is not configured for ${path}`;
    if (throwOnUnavailable) throw new Error(message);
    console.warn(`[SEO] ${message}`);
    return null;
  }

  try {
    const response = await fetch(`${SERVER_API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      ...(revalidate
        ? { next: { revalidate } }
        : {
            cache: 'no-store' as const,
          }),
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      const message = `API request failed for ${path} with status ${response.status}`;
      if (throwOnUnavailable) throw new Error(message);
      console.warn(`[SEO] ${message}`);
      return null;
    }
    const body = await response.text();
    if (!body.trim()) return null;
    return JSON.parse(body) as T;
  } catch (error) {
    if (throwOnUnavailable) throw error;
    const message = error instanceof Error ? error.message : 'unknown error';
    console.warn(`[SEO] API request unavailable for ${path}: ${message}`);
    return null;
  }
}

const PRODUCT_DETAIL_REVALIDATE_SECONDS = 15;

export const getProductBySlug = cache(async (slug: string) => {
  const normalizedSlug = slug.trim();
  if (!isValidProductSlug(normalizedSlug)) return null;
  const result = await fetchPublicJson<unknown>(
    `/products/slug/${encodeURIComponent(normalizedSlug)}`,
    // Same short window as the lists: a popular product page no longer queries Neon on every
    // view. Cart and checkout still re-read the product uncached (public-api.ts).
    { throwOnUnavailable: true, revalidate: PRODUCT_DETAIL_REVALIDATE_SECONDS },
  );
  if (result === null) return null;
  if (typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Malformed product response received from the public API');
  }
  return normalizePublicProduct(result);
});

export const getProductById = cache(async (id: string) => {
  if (!id.trim()) return null;
  const result = await fetchPublicJson<unknown>(`/products/${encodeURIComponent(id)}`, {
    throwOnUnavailable: true,
    revalidate: PRODUCT_DETAIL_REVALIDATE_SECONDS,
  });
  if (result === null) return null;
  if (typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Malformed product response received from the public API');
  }
  return normalizePublicProduct(result);
});

export async function getRelatedProducts(id: string): Promise<PublicProduct[]> {
  const result = await fetchPublicJson<unknown>(`/products/related/${encodeURIComponent(id)}`, {
    revalidate: 15,
  });
  return normalizePublicProductList(result);
}

export async function getInitialProducts(limit = 60): Promise<PublicProduct[]> {
  const result = await fetchPublicJson<ProductPageResponse | PublicProduct[]>(
    // Card fields only: the home carousels never show specs or descriptions.
    `/products?view=card&page=1&limit=${Math.min(Math.max(limit, 1), 60)}`,
    { revalidate: 15 },
  );
  return normalizePublicProductList(Array.isArray(result) ? result : result?.items);
}

export async function getHomeProcessors(limit = 60): Promise<PublicProduct[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const result = await fetchPublicJson<ProductPageResponse>(
    `/products?category=CPU&page=1&limit=${safeLimit}`,
    { revalidate: 15 },
  );
  return normalizePublicProductList(result?.items);
}

/** Every public product matching `filters` (GET /products query, e.g. `{ isOnSale: 'true' }`). */
export async function getAllPublicProducts(
  filters: Record<string, string> = {},
): Promise<PublicProduct[]> {
  // Card fields only (offers, sitemap): no specs or descriptions in the response.
  const pagePath = (page: number) =>
    `/products?${new URLSearchParams({ view: 'card', ...filters, page: String(page), limit: '60' }).toString()}`;
  const first = await fetchPublicJson<ProductPageResponse>(pagePath(1), {
    revalidate: 15,
  });
  if (!first || !Array.isArray(first.items)) return [];
  const totalPages = Math.max(1, Number(first.totalPages) || Math.ceil((first.total || 0) / 60));
  if (totalPages === 1) return normalizePublicProductList(first.items);

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchPublicJson<ProductPageResponse>(pagePath(index + 2), {
        revalidate: 15,
      }),
    ),
  );
  return normalizePublicProductList([
    ...first.items,
    ...remaining.flatMap((page) => (Array.isArray(page?.items) ? page.items : [])),
  ]);
}

export type PublicBranding = { storeName?: string; logoUrl?: string | null };

export type PublicBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
};

export async function getPublicBranding(): Promise<PublicBranding | null> {
  return fetchPublicJson<PublicBranding>('/public/branding', { revalidate: 30 });
}

export async function getPublicBanners(): Promise<PublicBanner[]> {
  const result = await fetchPublicJson<PublicBanner[]>('/public/banners', { revalidate: 15 });
  return Array.isArray(result)
    ? result.filter((banner) => Boolean(banner.id && banner.title && banner.imageUrl))
    : [];
}
