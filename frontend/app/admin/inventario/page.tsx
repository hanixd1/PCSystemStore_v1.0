'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import { confirmAction, notify } from '@/lib/notify';

type Product = {
  id: string;
  name: string;
  sku?: string;
  numeroParte?: string;
  department?: string;
  category?: string;
  productType?: string;
  price: string | number;
  isOnSale?: boolean;
  salePrice?: string | number | null;
  stock: number;
  images?: string[];
};

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

type InventoryResponse = {
  items: Product[];
  pagination: Pagination;
};

type InventoryFilters = {
  search: string;
  category: string;
  productType: string;
};

const PAGE_SIZE = 30;

const PRODUCT_GROUPS: Record<string, Array<{ label: string; value: string }>> = {
  COMPONENTES: [
    { label: 'Procesador (CPU)', value: 'CPU' },
    { label: 'Placa Madre', value: 'MOTHERBOARD' },
    { label: 'Memoria RAM', value: 'RAM' },
    { label: 'Tarjeta de Video', value: 'GPU' },
    { label: 'Fuente de Poder', value: 'PSU' },
    { label: 'Gabinete / Case', value: 'CASE' },
    { label: 'Refrigeración', value: 'COOLER' },
    { label: 'Almacenamiento', value: 'STORAGE' },
  ],
  ORDENADORES: [
    { label: 'Laptop', value: 'LAPTOP' },
    { label: 'PC Desktop', value: 'PC_DESKTOP' },
    { label: 'Software / Licencia', value: 'SOFTWARE' },
    { label: 'Base Refrigeradora', value: 'LAPTOP_COOLING_BASE' },
    { label: 'Mochila', value: 'BACKPACK' },
  ],
  PERIFERICOS: [
    { label: 'Monitor', value: 'MONITOR' },
    { label: 'Teclado', value: 'KEYBOARD' },
    { label: 'Mouse', value: 'MOUSE' },
    { label: 'Mousepad', value: 'MOUSEPAD' },
    { label: 'Silla Gamer', value: 'CHAIR' },
    { label: 'Mesa Gamer', value: 'GAMING_DESK' },
    { label: 'Webcam', value: 'WEBCAM' },
    { label: 'Capturadora', value: 'CAPTURE_CARD' },
    { label: 'Cables y Hub', value: 'CABLE_HUB' },
  ],
  AUDIO: [
    { label: 'Audífonos / Headset', value: 'HEADSET' },
    { label: 'Micrófono', value: 'MICROPHONE' },
    { label: 'Parlantes', value: 'SPEAKER' },
  ],
};

const CATEGORY_OPTIONS = [
  { label: 'Todas las categorías', value: '' },
  { label: 'COMPONENTES', value: 'COMPONENTES' },
  { label: 'ORDENADORES', value: 'ORDENADORES' },
  { label: 'PERIFERICOS', value: 'PERIFERICOS' },
  { label: 'AUDIO', value: 'AUDIO' },
];

const PRODUCT_TYPE_LABELS = Object.values(PRODUCT_GROUPS)
  .flat()
  .reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

const initialFilters: InventoryFilters = {
  search: '',
  category: '',
  productType: '',
};

function getPageNumbers(page: number, totalPages: number) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((item) => item >= 1));
  return Array.from(pages)
    .filter((item) => item <= totalPages)
    .sort((a, b) => a - b);
}

function formatPrice(value: string | number | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draftFilters, setDraftFilters] = useState<InventoryFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<InventoryFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const typeOptions = useMemo(
    () => (draftFilters.category ? (PRODUCT_GROUPS[draftFilters.category] ?? []) : []),
    [draftFilters.category],
  );

  const hasActiveFilters =
    Boolean(appliedFilters.search.trim()) ||
    Boolean(appliedFilters.category) ||
    Boolean(appliedFilters.productType);

  const fetchProducts = async (nextPage = page, filters = appliedFilters) => {
    setLoading(true);
    setLoadError('');

    try {
      const res = await api.get<InventoryResponse>('/products/admin/list', {
        params: {
          search: filters.search.trim() || undefined,
          category: filters.category || undefined,
          productType: filters.productType || undefined,
          page: nextPage,
          limit: PAGE_SIZE,
        },
      });
      const data = res.data;
      setProducts(Array.isArray(data.items) ? data.items : []);
      setPagination(
        data.pagination ?? {
          page: nextPage,
          limit: PAGE_SIZE,
          totalItems: 0,
          totalPages: 1,
        },
      );
    } catch (error: unknown) {
      console.warn('No se pudo cargar el inventario', error);
      setProducts([]);
      setPagination({ page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 1 });
      setLoadError('No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts(page, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedFilters]);

  const handleSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const handleClearFilters = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Eliminar producto',
      message: '¿Estás seguro de eliminar este producto?',
      confirmText: 'Eliminar',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/products/${id}`);
      notify.success('Producto eliminado');
      if (products.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        await fetchProducts(page, appliedFilters);
      }
    } catch (error: unknown) {
      notify.error(getApiErrorMessage(error, 'Error al eliminar'));
    }
  };

  const startItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.totalItems);
  const pageNumbers = getPageNumbers(pagination.page, pagination.totalPages);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Inventario</h1>
          <p className="text-gray-500">
            {hasActiveFilters
              ? `${pagination.totalItems} productos encontrados.`
              : `Gestión total de ${pagination.totalItems} productos.`}
          </p>
        </div>
        <Link
          href="/admin/add-product"
          className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 font-bold text-white transition hover:bg-gray-800"
        >
          <FiPlus /> Nuevo Producto
        </Link>
      </div>

      <form onSubmit={handleSearch} className="space-y-2">
        <label
          htmlFor="inventory-search"
          className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500"
        >
          Buscar producto
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3">
          <FiSearch className="text-xl text-gray-400" />
          <input
            id="inventory-search"
            type="text"
            placeholder="Buscar por nombre o SKU..."
            className="w-full bg-transparent font-medium text-gray-700 outline-none"
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />
        </div>
      </form>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <div>
            <label
              htmlFor="category-filter"
              className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500"
            >
              Categoría
            </label>
            <select
              id="category-filter"
              value={draftFilters.category}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  category: event.target.value,
                  productType: '',
                }))
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 font-bold text-slate-700 outline-none transition focus:border-cyan-400"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="product-type-filter"
              className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500"
            >
              Tipo de producto
            </label>
            <select
              id="product-type-filter"
              value={draftFilters.productType}
              disabled={!draftFilters.category}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, productType: event.target.value }))
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 font-bold text-slate-700 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <option value="">
                {draftFilters.category ? 'Todos los tipos' : 'Selecciona una categoría'}
              </option>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl bg-cyan-400 px-6 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:bg-slate-300 disabled:text-slate-500"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>

          <button
            type="button"
            onClick={handleClearFilters}
            disabled={loading && !hasActiveFilters}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-5 font-black text-slate-600 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX /> Limpiar filtros
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 bg-slate-100/70 px-4 py-3 text-sm font-bold text-slate-500 md:flex-row">
          <span>
            Mostrando {startItem}-{endItem} de {pagination.totalItems} productos
          </span>
          <span>
            Página {pagination.page} de {pagination.totalPages}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-100/90 text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-semibold text-slate-500">
                    Cargando inventario...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <p className="font-bold text-red-600">{loadError}</p>
                    <button
                      type="button"
                      onClick={() => void fetchProducts(page, appliedFilters)}
                      className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700"
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-semibold text-gray-400">
                    No se encontraron productos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const sku = product.sku || product.numeroParte || 'Sin SKU';
                  const image = Array.isArray(product.images) ? product.images[0] : null;
                  const productType = product.productType || product.category || '';

                  return (
                    <tr key={product.id} className="group transition hover:bg-slate-100/70">
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            {image ? (
                              <img
                                src={image}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </div>
                          <div>
                            <p className="line-clamp-1 font-bold text-gray-900">{product.name}</p>
                            <p className="text-xs font-semibold text-gray-400">SKU: {sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="w-fit rounded bg-slate-200 px-2 py-1 text-xs font-black text-slate-700">
                            {product.department || product.category || 'Sin categoría'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {PRODUCT_TYPE_LABELS[productType] || productType}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-900">
                        {product.isOnSale && Number(product.salePrice) > 0 ? (
                          <div>
                            <span className="text-red-600">
                              S/. {formatPrice(product.salePrice)}
                            </span>
                            <span className="ml-2 text-xs text-gray-400 line-through">
                              S/. {formatPrice(product.price)}
                            </span>
                            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">
                              Oferta
                            </span>
                          </div>
                        ) : (
                          <>S/. {formatPrice(product.price)}</>
                        )}
                      </td>
                      <td className="p-4">
                        <div
                          className={`flex items-center gap-2 font-bold ${
                            product.stock < 5 ? 'text-red-500' : 'text-green-600'
                          }`}
                        >
                          {product.stock < 5 && <FiAlertCircle />}
                          {product.stock} u.
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <Link
                            href={`/admin/edit-product/${product.id}`}
                            className="rounded-lg bg-yellow-100 p-2 text-yellow-700 transition hover:bg-yellow-200"
                            title="Editar"
                          >
                            <FiEdit />
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDelete(product.id)}
                            className="rounded-lg bg-red-100 p-2 text-red-700 transition hover:bg-red-200"
                            title="Eliminar"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-100/40 px-4 py-4 md:flex-row">
          <button
            type="button"
            disabled={loading || pagination.page <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-2 font-bold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiChevronLeft /> Anterior
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {pageNumbers.map((pageNumber, index) => {
              const previous = pageNumbers[index - 1];
              const showGap = previous && pageNumber - previous > 1;

              return (
                <div key={pageNumber} className="flex items-center gap-2">
                  {showGap && <span className="font-bold text-slate-400">...</span>}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setPage(pageNumber)}
                    className={`h-10 min-w-10 rounded-xl px-3 font-black transition ${
                      pagination.page === pageNumber
                        ? 'bg-black text-white'
                        : 'border border-slate-200 bg-slate-100/70 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {pageNumber}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={loading || pagination.page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-2 font-bold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
