'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiBox, FiChevronRight, FiFilter, FiShoppingCart, FiSliders, FiX } from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { api } from '@/lib/api';
import { getDiscountPercent, getEffectivePrice, isSaleActive } from '@/lib/pricing';
import {
  GENERAL_PRODUCT_FILTERS,
  PRODUCT_FILTERS_BY_CATEGORY,
  ProductFilterConfig,
  SLUG_TO_CATEGORY,
} from '@/lib/products/productFiltersConfig';

const DICTIONARY: Record<string, string> = {
  componentes: 'Todos los Componentes',
  ordenadores: 'Ordenadores',
  perifericos: 'Perifericos',
  audio: 'Audio y Sonido',
  cpu: 'Procesadores',
  intel: 'Intel',
  amd: 'AMD',
  mobo: 'Placas Base',
  graficas: 'Tarjetas Graficas',
  nvidia: 'NVIDIA',
  ram: 'Memorias RAM',
  ddr4: 'DDR4',
  ddr5: 'DDR5',
  almacenamiento: 'Almacenamiento',
  solido: 'Discos Solidos (M.2 / NVMe)',
  sata: 'Discos SATA / HDD',
  torres: 'Torres y Gabinetes',
  fuentes: 'Fuentes de Poder',
  refrigeracion: 'Refrigeracion',
  pcs: 'PCs de Escritorio',
  laptops: 'Laptops',
  monitores: 'Monitores',
  teclados: 'Teclados',
  mouse: 'Mouse',
  chairs: 'Sillas Gaming',
  mousepad: 'Mousepad',
  'mesa-gamer': 'Mesa Gamer',
  audifonos: 'Audifonos',
  speakers: 'Parlantes',
  microphones: 'Microfonos',
  webcams: 'Webcams',
  capturadoras: 'Capturadoras',
  cables: 'Cables y Hub',
  'cables-y-hub': 'Cables y Hub',
  'laptop-accessorios': 'Accesorios para portatiles',
  'bases-refrigeradoras': 'Bases refrigeradoras',
  mochilas: 'Mochilas',
  proteccion: 'Proteccion electrica',
  ups: 'UPS',
  supresores: 'Supresores de picos',
  estabilizadores: 'Estabilizadores',
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  componentes: ['CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'PSU', 'CASE', 'COOLER', 'STORAGE'],
  ordenadores: ['LAPTOP', 'PC_DESKTOP', 'SOFTWARE', 'LAPTOP_COOLING_BASE', 'BACKPACK'],
  'laptop-accessorios': ['LAPTOP_COOLING_BASE', 'BACKPACK'],
  perifericos: [
    'MONITOR',
    'KEYBOARD',
    'MOUSE',
    'MOUSEPAD',
    'CHAIR',
    'GAMING_DESK',
    'WEBCAM',
    'CAPTURE_CARD',
    'CABLE_HUB',
    'PROTECTION',
  ],
  audio: ['HEADSET', 'SPEAKER', 'MICROPHONE'],
};

type ProductsResponse = {
  items?: any[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

type FilterOptions = Record<
  string,
  string[] | number | { min: number | null; max: number | null } | null
>;

const decodeSlugPart = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeSearchText = (value: string) => decodeSlugPart(value).replace(/\s+/g, ' ').trim();

const formatDisplayText = (value: string) =>
  normalizeSearchText(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getInitialRouteFilters = (fullSlug: string, lastSlug: string) => {
  const routeFilters: Record<string, string> = {};
  const [categorySlug, subSlug] = fullSlug.split('/');

  if (categorySlug === 'cpu' && subSlug === 'amd') routeFilters.cpuBrand = 'AMD';
  if (categorySlug === 'cpu' && subSlug === 'intel') routeFilters.cpuBrand = 'Intel';
  if (['mobo', 'motherboard'].includes(categorySlug) && subSlug === 'amd')
    routeFilters.platform = 'AMD';
  if (['mobo', 'motherboard'].includes(categorySlug) && subSlug === 'intel')
    routeFilters.platform = 'Intel';
  if (lastSlug === 'ddr4') routeFilters.ramType = 'DDR4';
  if (lastSlug === 'ddr5') routeFilters.ramType = 'DDR5';
  if (['graficas', 'gpu'].includes(categorySlug) && subSlug === 'nvidia')
    routeFilters.gpuChipset = 'NVIDIA';
  if (['graficas', 'gpu'].includes(categorySlug) && subSlug === 'amd')
    routeFilters.gpuChipset = 'AMD';
  if (lastSlug === 'solido') routeFilters.storageType = 'SSD';
  if (lastSlug === 'sata') routeFilters.storageType = 'SATA';
  if (lastSlug === 'liquida') routeFilters.coolerType = 'AIO';
  if (lastSlug === 'torre') routeFilters.coolerType = 'AIR';

  return routeFilters;
};

const resolveCategory = (slugParts: string[], lastSlug: string, fullSlug: string) => {
  if (SLUG_TO_CATEGORY[fullSlug]) return SLUG_TO_CATEGORY[fullSlug];
  const categorySlug = slugParts[0]?.toLowerCase();
  if (categorySlug && SLUG_TO_CATEGORY[categorySlug]) return SLUG_TO_CATEGORY[categorySlug];
  return SLUG_TO_CATEGORY[lastSlug];
};

const getFilterValue = (params: URLSearchParams, key: string, fallback = '') =>
  params.get(key) || fallback;

const areFiltersEqual = (a: Record<string, string>, b: Record<string, string>) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCartStore();

  const slugKey = useMemo(() => {
    const rawSlugArray = Array.isArray(params?.slug) ? params.slug : [];
    return rawSlugArray.join('/');
  }, [params?.slug]);
  const slugArray = useMemo(
    () => slugKey.split('/').map(normalizeSearchText).filter(Boolean),
    [slugKey],
  );
  const fullSlug = useMemo(
    () => slugArray.map((slug) => slug.toLowerCase()).join('/'),
    [slugArray],
  );
  const lastSlug = useMemo(() => slugArray[slugArray.length - 1]?.toLowerCase() || '', [slugArray]);
  const selectedCategory = useMemo(
    () => resolveCategory(slugArray, lastSlug, fullSlug),
    [fullSlug, lastSlug, slugArray],
  );
  const isKnownRoute = Boolean(selectedCategory || CATEGORY_GROUPS[lastSlug]);
  const routeFilters = useMemo(
    () => getInitialRouteFilters(fullSlug, lastSlug),
    [fullSlug, lastSlug],
  );
  const pageTitle = useMemo(
    () =>
      DICTIONARY[lastSlug] ||
      DICTIONARY[fullSlug] ||
      formatDisplayText(slugArray[slugArray.length - 1] || ''),
    [fullSlug, lastSlug, slugArray],
  );

  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});

  const searchParamString = searchParams.toString();
  const filterConfig = useMemo(
    () => (selectedCategory ? PRODUCT_FILTERS_BY_CATEGORY[selectedCategory] || [] : []),
    [selectedCategory],
  );
  const priceFilters = useMemo(
    () =>
      GENERAL_PRODUCT_FILTERS.filter(
        (filter) => filter.key === 'minPrice' || filter.key === 'maxPrice',
      ),
    [],
  );
  const nonPriceGeneralFilters = useMemo(
    () =>
      GENERAL_PRODUCT_FILTERS.filter(
        (filter) => filter.key !== 'minPrice' && filter.key !== 'maxPrice',
      ),
    [],
  );

  useEffect(() => {
    const paramsSnapshot = new URLSearchParams(searchParamString);
    const nextDraft: Record<string, string> = {};

    [...GENERAL_PRODUCT_FILTERS, ...filterConfig].forEach((filter) => {
      if (filter.key === 'sortBy') {
        const sortBy = paramsSnapshot.get('sortBy');
        const sortOrder = paramsSnapshot.get('sortOrder');
        nextDraft.sortBy = sortBy ? `${sortBy}:${sortOrder || 'desc'}` : '';
        return;
      }

      nextDraft[filter.key] = getFilterValue(
        paramsSnapshot,
        filter.key,
        routeFilters[filter.key] || '',
      );
    });

    setDraftFilters((previous) => (areFiltersEqual(previous, nextDraft) ? previous : nextDraft));
  }, [filterConfig, routeFilters, searchParamString]);

  const productsQueryString = useMemo(() => {
    if (!fullSlug || !isKnownRoute) return '';

    const query = new URLSearchParams(searchParamString);
    query.set('page', query.get('page') || '1');
    query.set('limit', query.get('limit') || '24');

    if (selectedCategory) {
      query.set('category', selectedCategory);
    } else if (CATEGORY_GROUPS[lastSlug]) {
      query.set('categories', CATEGORY_GROUPS[lastSlug].join(','));
    }

    Object.entries(routeFilters).forEach(([key, value]) => {
      if (!query.has(key) && value) query.set(key, value);
    });

    return query.toString();
  }, [fullSlug, isKnownRoute, lastSlug, routeFilters, searchParamString, selectedCategory]);

  useEffect(() => {
    if (!fullSlug || !productsQueryString) {
      setProducts([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    api
      .get(`/products?${productsQueryString}`, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        const data: ProductsResponse | any[] = res.data;
        const items = Array.isArray(data) ? data : data.items || [];
        setProducts(items);
        setTotal(Array.isArray(data) ? items.length : data.total || items.length);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error(err);
        setProducts([]);
        setTotal(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [fullSlug, productsQueryString]);

  const filterOptionsQueryString = useMemo(() => {
    if (!isKnownRoute) return '';

    const query = new URLSearchParams();
    if (selectedCategory) query.set('category', selectedCategory);
    if (!selectedCategory && CATEGORY_GROUPS[lastSlug])
      query.set('categories', CATEGORY_GROUPS[lastSlug].join(','));
    return query.toString();
  }, [isKnownRoute, lastSlug, selectedCategory]);

  useEffect(() => {
    if (!filterOptionsQueryString) {
      setFilterOptions({});
      return;
    }

    const controller = new AbortController();

    api
      .get(`/products/filter-options?${filterOptionsQueryString}`, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setFilterOptions(res.data || {});
      })
      .catch(() => {
        if (!controller.signal.aborted) setFilterOptions({});
      });

    return () => controller.abort();
  }, [filterOptionsQueryString]);

  const updateDraft = (key: string, value: string) => {
    setDraftFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === 'cpuBrand') {
        const validSockets =
          value === 'AMD'
            ? ['AM4', 'AM5']
            : value === 'Intel'
              ? ['LGA 1200', 'LGA 1700', 'LGA 1851']
              : [];
        if (validSockets.length && next.socket && !validSockets.includes(next.socket)) {
          next.socket = '';
        }
      }
      if (key === 'platform') {
        const validSockets =
          value === 'AMD'
            ? ['AM4', 'AM5']
            : value === 'Intel'
              ? ['LGA 1200', 'LGA 1700', 'LGA 1851']
              : [];
        if (validSockets.length && next.socket && !validSockets.includes(next.socket)) {
          next.socket = '';
        }
      }
      return next;
    });
  };

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    const query = new URLSearchParams();

    Object.entries(draftFilters).forEach(([key, value]) => {
      if (!value) return;
      if (key === 'sortBy') {
        const [sortBy, sortOrder] = value.split(':');
        if (sortBy) query.set('sortBy', sortBy);
        if (sortOrder) query.set('sortOrder', sortOrder);
        return;
      }
      query.set(key, value);
    });

    query.set('page', '1');
    router.push(
      `/categoria/${slugArray.map((slug) => encodeURIComponent(slug)).join('/')}?${query.toString()}`,
    );
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters({});
    router.push(`/categoria/${slugArray.map((slug) => encodeURIComponent(slug)).join('/')}`);
    setFiltersOpen(false);
  };

  const renderFilter = (filter: ProductFilterConfig) => {
    const dynamicOptions = Array.isArray(filterOptions[filter.optionSource || ''])
      ? (filterOptions[filter.optionSource || ''] as string[])
      : [];
    let options = dynamicOptions.length
      ? [{ label: 'Todos', value: '' }, ...dynamicOptions.map((value) => ({ label: value, value }))]
      : filter.options;

    if (filter.key === 'socket' && selectedCategory === 'CPU') {
      const selectedBrand = draftFilters.cpuBrand;
      if (selectedBrand === 'AMD')
        options = options?.filter(
          (option) => !option.value || ['AM4', 'AM5'].includes(option.value),
        );
      if (selectedBrand === 'Intel') {
        options = options?.filter(
          (option) => !option.value || ['LGA 1200', 'LGA 1700', 'LGA 1851'].includes(option.value),
        );
      }
    }

    if (filter.key === 'socket' && selectedCategory === 'MOTHERBOARD') {
      const selectedPlatform = draftFilters.platform;
      if (selectedPlatform === 'AMD')
        options = options?.filter(
          (option) => !option.value || ['AM4', 'AM5'].includes(option.value),
        );
      if (selectedPlatform === 'Intel') {
        options = options?.filter(
          (option) => !option.value || ['LGA 1200', 'LGA 1700', 'LGA 1851'].includes(option.value),
        );
      }
    }

    if (filter.dependsOn && !filter.dependsOn.values.includes(draftFilters[filter.dependsOn.key])) {
      return null;
    }

    return (
      <label key={filter.key} className="block">
        <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">
          {filter.label}
        </span>
        {filter.type === 'select' ? (
          <select
            value={draftFilters[filter.key] || ''}
            onChange={(event) => updateDraft(filter.key, event.target.value)}
            className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-cyan"
          >
            {(options || [{ label: 'Todos', value: '' }]).map((option) => (
              <option key={`${filter.key}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={filter.type === 'number' ? 'number' : 'text'}
            min={filter.type === 'number' ? 0 : undefined}
            placeholder={
              filter.key === 'minPrice'
                ? 'S/. Min'
                : filter.key === 'maxPrice'
                  ? 'S/. Max'
                  : undefined
            }
            value={draftFilters[filter.key] || ''}
            onChange={(event) => updateDraft(filter.key, event.target.value)}
            className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-cyan"
          />
        )}
      </label>
    );
  };

  const renderPriceFilters = () => (
    <div className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">
        Precio
      </span>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {priceFilters.map((filter) => (
          <input
            key={filter.key}
            type="number"
            min={0}
            placeholder={filter.key === 'minPrice' ? 'S/. Min' : 'S/. Max'}
            value={draftFilters[filter.key] || ''}
            onChange={(event) => updateDraft(filter.key, event.target.value)}
            className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-cyan"
          />
        ))}
      </div>
    </div>
  );

  const renderConfiguredFilters = () => {
    if (selectedCategory === 'PC_DESKTOP') {
      return (
        <>
          {renderPriceFilters()}
          {filterConfig.map(renderFilter)}
        </>
      );
    }

    if (
      selectedCategory === 'MOTHERBOARD' ||
      selectedCategory === 'GPU' ||
      selectedCategory === 'RAM' ||
      selectedCategory === 'STORAGE' ||
      selectedCategory === 'PSU' ||
      selectedCategory === 'CASE' ||
      selectedCategory === 'COOLER' ||
      selectedCategory === 'LAPTOP' ||
      selectedCategory === 'MONITOR' ||
      selectedCategory === 'KEYBOARD' ||
      selectedCategory === 'MOUSE' ||
      selectedCategory === 'MOUSEPAD' ||
      selectedCategory === 'WEBCAM' ||
      selectedCategory === 'CAPTURE_CARD' ||
      selectedCategory === 'CABLE_HUB' ||
      selectedCategory === 'CHAIR' ||
      selectedCategory === 'GAMING_DESK' ||
      selectedCategory === 'LAPTOP_COOLING_BASE' ||
      selectedCategory === 'BACKPACK' ||
      selectedCategory === 'HEADSET' ||
      selectedCategory === 'MICROPHONE' ||
      selectedCategory === 'SPEAKER'
    ) {
      const [brandFilter, ...remainingFilters] = filterConfig;
      return (
        <>
          {brandFilter ? renderFilter(brandFilter) : null}
          {renderPriceFilters()}
          {remainingFilters.map(renderFilter)}
        </>
      );
    }

    return (
      <>
        {filterConfig.map(renderFilter)}
        {renderPriceFilters()}
      </>
    );
  };

  const filtersPanel = (
    <form onSubmit={applyFilters} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">Filtros</h2>
        <button
          type="button"
          onClick={() => setFiltersOpen(false)}
          className="lg:hidden text-gray-500"
        >
          <FiX />
        </button>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-4">
        {renderConfiguredFilters()}
        {nonPriceGeneralFilters.map(renderFilter)}
      </div>

      <div className="flex gap-2 border-t border-gray-100 pt-4">
        <button
          type="submit"
          className="flex-1 bg-gray-900 px-4 py-3 text-sm font-black text-white hover:bg-brand-cyan hover:text-black"
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="border border-gray-300 px-4 py-3 text-sm font-black text-gray-600 hover:border-brand-cyan"
        >
          Limpiar
        </button>
      </div>
    </form>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="border-b border-gray-300 bg-gray-50 pt-8 pb-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center text-sm font-bold text-gray-400 mb-4 capitalize overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-brand-cyan transition">
              Inicio
            </Link>

            {slugArray.map((slug, index) => {
              const isLast = index === slugArray.length - 1;
              const href = `/categoria/${slugArray
                .slice(0, index + 1)
                .map((part) => encodeURIComponent(part))
                .join('/')}`;
              return (
                <div key={slug} className="flex items-center">
                  <FiChevronRight className="mx-2 flex-shrink-0" />
                  {isLast ? (
                    <span className="text-gray-900 capitalize">
                      {DICTIONARY[slug.toLowerCase()] || formatDisplayText(slug)}
                    </span>
                  ) : (
                    <Link href={href} className="hover:text-brand-cyan transition capitalize">
                      {DICTIONARY[slug.toLowerCase()] || formatDisplayText(slug)}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 capitalize tracking-tight flex items-center gap-3">
              <FiFilter className="text-brand-cyan" /> {pageTitle}
            </h1>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 px-4 py-3 text-sm font-black text-white lg:hidden"
            >
              <FiSliders /> Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden bg-transparent p-0 lg:block">{filtersPanel}</aside>

          {filtersOpen ? (
            <div className="fixed inset-0 z-50 bg-black/40 p-4 lg:hidden">
              <div className="ml-auto h-full max-w-sm overflow-y-auto border-l border-gray-300 bg-white p-5">
                {filtersPanel}
              </div>
            </div>
          ) : null}

          <main>
            <div className="mb-5 flex items-center justify-between border-b border-gray-300 pb-3 text-sm font-bold text-gray-500">
              <span>{loading ? 'Cargando productos...' : `${total} producto(s) encontrados`}</span>
              {selectedCategory ? (
                <span className="text-brand-cyan">{selectedCategory}</span>
              ) : null}
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-brand-cyan"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="mx-auto mt-10 flex min-h-[320px] max-w-2xl flex-col items-center justify-center bg-transparent p-8 text-center">
                <FiBox className="mx-auto text-6xl text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  No se encontraron productos
                </h2>
                <p className="text-gray-500 mb-6">
                  No hay productos que coincidan con los filtros seleccionados.
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-brand-cyan px-6 py-3 font-bold text-gray-900 transition hover:bg-cyan-400"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="group flex flex-col overflow-hidden border border-gray-300 bg-gray-50 transition-colors duration-200 hover:border-gray-500"
                  >
                    <Link
                      href={`/product/${product.id}`}
                      className="relative flex h-56 items-center justify-center bg-transparent p-6"
                    >
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <FiBox className="text-gray-200 text-6xl" />
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col p-5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        {product.category}
                      </span>

                      <Link href={`/product/${product.id}`}>
                        <h3 className="font-bold text-sm text-gray-800 leading-tight mb-4 hover:text-brand-cyan transition line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="mt-auto flex items-end justify-between pt-4">
                        <div>
                          {isSaleActive(product) ? (
                            <div className="mb-1 flex items-center gap-2">
                              <span className="border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">
                                -{getDiscountPercent(product)}%
                              </span>
                              <span className="text-xs font-bold text-gray-400 line-through">
                                S/. {Number(product.price).toFixed(2)}
                              </span>
                            </div>
                          ) : null}
                          <p className="text-xl font-black text-gray-900">
                            S/. {getEffectivePrice(product).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            addItem(product);
                            alert('Anadido al carrito');
                          }}
                          disabled={product.stock <= 0}
                          className="bg-gray-900 p-2.5 text-white transition hover:bg-brand-cyan hover:text-black disabled:cursor-not-allowed disabled:opacity-50 group-active:scale-95"
                        >
                          <FiShoppingCart className="text-lg" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
