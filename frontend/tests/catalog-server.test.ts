import { afterEach, describe, expect, it, vi } from 'vitest';

const completeProduct = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'AMD Ryzen 7 9700X',
  slug: 'amd-ryzen-7-9700x',
  price: '1499.90',
  stock: 3,
  category: 'CPU',
  images: [],
};

async function loadCatalogServer() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
  return import('../lib/catalog-server');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('product API resolution', () => {
  it('loads the home CPU candidate pool in one category-filtered request', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ items: [completeProduct], total: 1, totalPages: 1 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { getHomeProcessors } = await loadCatalogServer();

    await expect(getHomeProcessors()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/products?category=CPU&page=1&limit=60',
    );
  });

  it('returns a normalized public product', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(completeProduct)),
    );
    const { getProductBySlug } = await loadCatalogServer();
    await expect(getProductBySlug('amd-ryzen-7-9700x')).resolves.toMatchObject({
      price: 1499.9,
      stock: 3,
    });
  });

  it('returns null for a missing or non-public product', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ...completeProduct, price: null })),
    );
    const { getProductBySlug } = await loadCatalogServer();
    await expect(getProductBySlug('amd-ryzen-7-9700x')).resolves.toBeNull();
  });

  it('keeps a real 404 separate from an unavailable API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    let catalog = await loadCatalogServer();
    await expect(catalog.getProductBySlug('producto-inexistente')).resolves.toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    catalog = await loadCatalogServer();
    await expect(catalog.getProductBySlug('producto-temporal')).rejects.toThrow(/status 503/);
  });

  it('rejects a malformed response so the route error boundary can handle it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(['unexpected'])),
    );
    const { getProductBySlug } = await loadCatalogServer();
    await expect(getProductBySlug('producto-malformado')).rejects.toThrow(
      /Malformed product response/,
    );
  });

  it('filters invalid catalog records before they can create links or sitemap entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          items: [completeProduct, { ...completeProduct, slug: null }],
          total: 2,
          totalPages: 1,
        }),
      ),
    );
    const { getInitialProducts, getAllPublicProducts } = await loadCatalogServer();
    await expect(getInitialProducts()).resolves.toHaveLength(1);
    await expect(getAllPublicProducts()).resolves.toHaveLength(1);
  });
});
