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
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  componentes: ['CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'PSU', 'CASE', 'COOLER', 'STORAGE'],
  ordenadores: ['LAPTOP', 'PC_DESKTOP', 'SOFTWARE'],
  perifericos: ['MONITOR', 'KEYBOARD', 'MOUSE', 'MOUSEPAD', 'CHAIR', 'GAMING_DESK'],
  audio: ['HEADSET', 'SPEAKER', 'MICROPHONE'],
};

type ProductsResponse = {
  items?: any[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

type FilterOptions = Record<string, string[] | number | { min: number | null; max: number | null } | null>;

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

  if (fullSlug === 'cpu/amd') routeFilters.cpuBrand = 'AMD';
  if (fullSlug === 'cpu/intel') routeFilters.cpuBrand = 'Intel';
  if (fullSlug === 'mobo/amd') routeFilters.platform = 'AMD';
  if (fullSlug === 'mobo/intel') routeFilters.platform = 'Intel';
  if (lastSlug === 'ddr4') routeFilters.ramType = 'DDR4';
  if (lastSlug === 'ddr5') routeFilters.ramType = 'DDR5';
  if (lastSlug === 'nvidia') routeFilters.gpuChipset = 'NVIDIA';
  if (fullSlug === 'graficas/amd') routeFilters.gpuChipset = 'AMD';
  if (lastSlug === 'solido') routeFilters.storageType = 'SSD';
  if (lastSlug === 'sata') routeFilters.storageType = 'SATA';
  if (lastSlug === 'liquida') routeFilters.coolerType = 'AIO';
  if (lastSlug === 'torre') routeFilters.coolerType = 'AIR';

  return routeFilters;
};

const resolveCategory = (lastSlug: string, fullSlug: string) => {
  if (SLUG_TO_CATEGORY[fullSlug]) return SLUG_TO_CATEGORY[fullSlug];
  return SLUG_TO_CATEGORY[lastSlug];
};

const getFilterValue = (params: URLSearchParams, key: string, fallback = '') => params.get(key) || fallback;

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCartStore();

  const rawSlugArray = Array.isArray(params?.slug) ? params.slug : [];
  const slugArray = rawSlugArray.map(normalizeSearchText).filter(Boolean);
  const fullSlug = slugArray.map((slug) => slug.toLowerCase()).join('/');
  const lastSlug = slugArray[slugArray.length - 1]?.toLowerCase() || '';
  const selectedCategory = resolveCategory(lastSlug, fullSlug);
  const routeFilters = useMemo(() => getInitialRouteFilters(fullSlug, lastSlug), [fullSlug, lastSlug]);
  const pageTitle =
    DICTIONARY[lastSlug] ||
    DICTIONARY[fullSlug] ||
    formatDisplayText(slugArray[slugArray.length - 1] || '');

  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});

  const searchParamString = searchParams.toString();
  const filterConfig = selectedCategory ? PRODUCT_FILTERS_BY_CATEGORY[selectedCategory] || [] : [];

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

      nextDraft[filter.key] = getFilterValue(paramsSnapshot, filter.key, routeFilters[filter.key] || '');
    });

    setDraftFilters(nextDraft);
  }, [filterConfig, routeFilters, searchParamString]);

  useEffect(() => {
    if (!fullSlug) return;

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

    setLoading(true);
    api
      .get(`/products?${query.toString()}`)
      .then((res) => {
        const data: ProductsResponse | any[] = res.data;
        const items = Array.isArray(data) ? data : data.items || [];
        setProducts(items);
        setTotal(Array.isArray(data) ? items.length : data.total || items.length);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [fullSlug, lastSlug, routeFilters, searchParamString, selectedCategory]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (selectedCategory) query.set('category', selectedCategory);
    if (!selectedCategory && CATEGORY_GROUPS[lastSlug]) query.set('categories', CATEGORY_GROUPS[lastSlug].join(','));

    api
      .get(`/products/filter-options?${query.toString()}`)
      .then((res) => setFilterOptions(res.data || {}))
      .catch(() => setFilterOptions({}));
  }, [lastSlug, selectedCategory]);

  const updateDraft = (key: string, value: string) => {
    setDraftFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === 'cpuBrand') {
        const validSockets = value === 'AMD' ? ['AM4', 'AM5'] : value === 'Intel' ? ['LGA 1200', 'LGA 1700', 'LGA 1851'] : [];
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
    router.push(`/categoria/${slugArray.map((slug) => encodeURIComponent(slug)).join('/')}?${query.toString()}`);
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
      if (selectedBrand === 'AMD') options = options?.filter((option) => !option.value || ['AM4', 'AM5'].includes(option.value));
      if (selectedBrand === 'Intel') {
        options = options?.filter((option) => !option.value || ['LGA 1200', 'LGA 1700', 'LGA 1851'].includes(option.value));
      }
    }

    if (filter.dependsOn && !filter.dependsOn.values.includes(draftFilters[filter.dependsOn.key])) {
      return null;
    }

    return (
      <label key={filter.key} className="block">
        <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">{filter.label}</span>
        {filter.type === 'select' ? (
          <select
            value={draftFilters[filter.key] || ''}
            onChange={(event) => updateDraft(filter.key, event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-cyan"
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
            value={draftFilters[filter.key] || ''}
            onChange={(event) => updateDraft(filter.key, event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-cyan"
          />
        )}
      </label>
    );
  };

  const filtersPanel = (
    <form onSubmit={applyFilters} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">Filtros</h2>
        <button type="button" onClick={() => setFiltersOpen(false)} className="lg:hidden text-gray-500">
          <FiX />
        </button>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-4">{GENERAL_PRODUCT_FILTERS.map(renderFilter)}</div>
      {filterConfig.length > 0 ? (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-black uppercase tracking-widest text-brand-cyan">Especificaciones</p>
          {filterConfig.map(renderFilter)}
        </div>
      ) : null}

      <div className="flex gap-2 border-t border-gray-100 pt-4">
        <button type="submit" className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-black text-white hover:bg-brand-cyan hover:text-black">
          Aplicar
        </button>
        <button type="button" onClick={clearFilters} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-black text-gray-600 hover:border-brand-cyan">
          Limpiar
        </button>
      </div>
    </form>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b border-gray-200 pt-8 pb-8 shadow-sm">
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
                    <span className="text-gray-900 capitalize">{DICTIONARY[slug.toLowerCase()] || formatDisplayText(slug)}</span>
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-black text-white lg:hidden"
            >
              <FiSliders /> Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-sm lg:block">{filtersPanel}</aside>

          {filtersOpen ? (
            <div className="fixed inset-0 z-50 bg-black/40 p-4 lg:hidden">
              <div className="ml-auto h-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">{filtersPanel}</div>
            </div>
          ) : null}

          <main>
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-5 py-4 text-sm font-bold text-gray-500">
              <span>{loading ? 'Cargando productos...' : `${total} producto(s) encontrados`}</span>
              {selectedCategory ? <span className="text-brand-cyan">{selectedCategory}</span> : null}
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-brand-cyan"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center max-w-2xl mx-auto mt-10">
                <FiBox className="mx-auto text-6xl text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">No se encontraron productos</h2>
                <p className="text-gray-500 mb-6">No hay productos que coincidan con los filtros seleccionados.</p>
                <button onClick={clearFilters} className="bg-brand-cyan text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-cyan-400 transition">
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col overflow-hidden group"
                  >
                    <Link href={`/product/${product.id}`} className="block relative h-56 p-6 bg-white flex items-center justify-center border-b border-gray-50">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-110 transition duration-500"
                        />
                      ) : (
                        <FiBox className="text-gray-200 text-6xl" />
                      )}
                    </Link>

                    <div className="p-5 flex-1 flex flex-col bg-gray-50/30">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{product.category}</span>

                      <Link href={`/product/${product.id}`}>
                        <h3 className="font-bold text-sm text-gray-800 leading-tight mb-4 hover:text-brand-cyan transition line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="mt-auto flex items-end justify-between pt-4 border-t border-gray-100">
                        <div>
                          {isSaleActive(product) ? (
                            <div className="mb-1 flex items-center gap-2">
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">
                                -{getDiscountPercent(product)}%
                              </span>
                              <span className="text-xs font-bold text-gray-400 line-through">S/. {Number(product.price).toFixed(2)}</span>
                            </div>
                          ) : null}
                          <p className="text-xl font-black text-gray-900">S/. {getEffectivePrice(product).toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => {
                            addItem(product);
                            alert('Añadido al carrito');
                          }}
                          disabled={product.stock <= 0}
                          className="bg-gray-900 text-white p-2.5 rounded-xl hover:bg-brand-cyan hover:text-black transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed group-active:scale-95"
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
