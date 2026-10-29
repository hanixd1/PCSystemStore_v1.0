import { API_URL } from '@/lib/api';

const MAX_PUBLIC_PRODUCT_PAGE_SIZE = 60;

export type PublicProductsPage<T = unknown> = {
  items?: T[];
  total?: number;
  totalPages?: number;
};

type PublicFetchOptions = {
  signal?: AbortSignal;
};

export class PublicApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
  ) {
    super(`La API pública respondió ${status} para ${path}.`);
    this.name = 'PublicApiError';
  }
}

function buildFreshPublicApiUrl(path: string): string {
  if (!API_URL) {
    throw new Error('Falta configurar NEXT_PUBLIC_API_URL para consultar el catálogo público.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${API_URL}${normalizedPath}`).toString();
}

/**
 * Public catalog reads are never served stale: `cache: 'no-cache'` makes the browser ask the
 * API every time, but with the ETag of its copy, so an unchanged answer is a `304` with no
 * body (the API sends `private, no-cache` and forbids CDN caching). The URL is stable on
 * purpose: a unique query value per request would defeat that revalidation.
 */
export async function fetchFreshPublicJson<T>(
  path: string,
  options: PublicFetchOptions = {},
): Promise<T> {
  const response = await fetch(buildFreshPublicApiUrl(path), {
    method: 'GET',
    cache: 'no-cache',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new PublicApiError(response.status, path);
  }

  const body = await response.text();
  if (!body.trim()) {
    throw new Error(`La API pública devolvió una respuesta vacía para ${path}.`);
  }

  return JSON.parse(body) as T;
}

export function getPublicProductItems<T>(value: PublicProductsPage<T> | T[]): T[] {
  if (Array.isArray(value)) return value;
  return Array.isArray(value.items) ? value.items : [];
}

/** Filters accepted by GET /products, e.g. `{ categories: 'CPU,GPU' }` or `{ isOnSale: 'true' }`. */
export type PublicProductFilters = Record<string, string>;

function productsPagePath(page: number, filters: PublicProductFilters): string {
  const params = new URLSearchParams({
    ...filters,
    page: String(page),
    limit: String(MAX_PUBLIC_PRODUCT_PAGE_SIZE),
  });
  return `/products?${params.toString()}`;
}

export async function fetchAllFreshPublicProducts<T = unknown>(
  options: PublicFetchOptions & { filters?: PublicProductFilters } = {},
): Promise<T[]> {
  const filters = options.filters ?? {};
  const first = await fetchFreshPublicJson<PublicProductsPage<T> | T[]>(
    productsPagePath(1, filters),
    options,
  );
  const firstItems = getPublicProductItems(first);
  if (Array.isArray(first)) return firstItems;

  const totalPages = Math.max(
    1,
    Number(first.totalPages) ||
      Math.ceil((Number(first.total) || firstItems.length) / MAX_PUBLIC_PRODUCT_PAGE_SIZE),
  );
  if (totalPages === 1) return firstItems;

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchFreshPublicJson<PublicProductsPage<T>>(productsPagePath(index + 2, filters), options),
    ),
  );

  return [
    ...firstItems,
    ...remaining.flatMap((page) => (Array.isArray(page.items) ? page.items : [])),
  ];
}
