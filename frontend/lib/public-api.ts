import { API_URL } from '@/lib/api';

const FRESHNESS_QUERY_PARAM = '_pcss_fresh';
const MAX_PUBLIC_PRODUCT_PAGE_SIZE = 60;
let requestSequence = 0;

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
  const url = new URL(`${API_URL}${normalizedPath}`);
  requestSequence += 1;
  url.searchParams.set(FRESHNESS_QUERY_PARAM, `${Date.now()}-${requestSequence}`);
  return url.toString();
}

/**
 * Public catalog reads must not use the browser HTTP cache. The unique query
 * value also protects clients while an upstream CDN cache rule is being fixed.
 */
export async function fetchFreshPublicJson<T>(
  path: string,
  options: PublicFetchOptions = {},
): Promise<T> {
  const response = await fetch(buildFreshPublicApiUrl(path), {
    method: 'GET',
    cache: 'no-store',
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

export async function fetchAllFreshPublicProducts<T = unknown>(
  options: PublicFetchOptions = {},
): Promise<T[]> {
  const first = await fetchFreshPublicJson<PublicProductsPage<T> | T[]>(
    `/products?page=1&limit=${MAX_PUBLIC_PRODUCT_PAGE_SIZE}`,
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
      fetchFreshPublicJson<PublicProductsPage<T>>(
        `/products?page=${index + 2}&limit=${MAX_PUBLIC_PRODUCT_PAGE_SIZE}`,
        options,
      ),
    ),
  );

  return [
    ...firstItems,
    ...remaining.flatMap((page) => (Array.isArray(page.items) ? page.items : [])),
  ];
}
