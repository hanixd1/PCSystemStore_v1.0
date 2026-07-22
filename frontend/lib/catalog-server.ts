import { cache } from 'react';
import { API_URL } from '@/lib/api';
import {
  isValidProductSlug,
  normalizePublicProduct,
  normalizePublicProductList,
  type PublicProduct,
} from '@/lib/public-product';

export type { PublicProduct } from '@/lib/public-product';

type ProductPageResponse = {
  items?: PublicProduct[];
  total?: number;
  totalPages?: number;
};

async function fetchPublicJson<T>(
  path: string,
  revalidate = 60,
  throwOnUnavailable = false,
): Promise<T | null> {
  if (!API_URL) {
    const message = `API unavailable: NEXT_PUBLIC_API_URL is not configured for ${path}`;
    if (throwOnUnavailable) throw new Error(message);
    console.warn(`[SEO] ${message}`);
    return null;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate } });
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

export const getProductBySlug = cache(async (slug: string) => {
  const normalizedSlug = slug.trim();
  if (!isValidProductSlug(normalizedSlug)) return null;
  const result = await fetchPublicJson<unknown>(
    `/products/slug/${encodeURIComponent(normalizedSlug)}`,
    60,
    true,
  );
  if (result === null) return null;
  if (typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Malformed product response received from the public API');
  }
  return normalizePublicProduct(result);
});

export const getProductById = cache(async (id: string) => {
  if (!id.trim()) return null;
  const result = await fetchPublicJson<unknown>(`/products/${encodeURIComponent(id)}`, 60, true);
  if (result === null) return null;
  if (typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Malformed product response received from the public API');
  }
  return normalizePublicProduct(result);
});

export async function getRelatedProducts(id: string): Promise<PublicProduct[]> {
  const result = await fetchPublicJson<unknown>(`/products/related/${encodeURIComponent(id)}`, 60);
  return normalizePublicProductList(result);
}

export async function getInitialProducts(limit = 60): Promise<PublicProduct[]> {
  const result = await fetchPublicJson<ProductPageResponse | PublicProduct[]>(
    `/products?page=1&limit=${Math.min(Math.max(limit, 1), 60)}`,
    60,
  );
  return normalizePublicProductList(Array.isArray(result) ? result : result?.items);
}

export async function getHomeProcessors(limit = 60): Promise<PublicProduct[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const result = await fetchPublicJson<ProductPageResponse>(
    `/products?category=CPU&page=1&limit=${safeLimit}`,
    60,
  );
  return normalizePublicProductList(result?.items);
}

export async function getAllPublicProducts(): Promise<PublicProduct[]> {
  const first = await fetchPublicJson<ProductPageResponse>('/products?page=1&limit=60', 300);
  if (!first || !Array.isArray(first.items)) return [];
  const totalPages = Math.max(1, Number(first.totalPages) || Math.ceil((first.total || 0) / 60));
  if (totalPages === 1) return normalizePublicProductList(first.items);

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchPublicJson<ProductPageResponse>(`/products?page=${index + 2}&limit=60`, 300),
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
  return fetchPublicJson<PublicBranding>('/public/branding', 300);
}

export async function getPublicBanners(): Promise<PublicBanner[]> {
  const result = await fetchPublicJson<PublicBanner[]>('/public/banners', 60);
  return Array.isArray(result)
    ? result.filter((banner) => Boolean(banner.id && banner.title && banner.imageUrl))
    : [];
}
