'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiChevronRight, FiShoppingCart, FiCheck, FiBox } from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { api } from '@/lib/api';
import { buildSpecificationRows } from '@/lib/productSpecifications';
import { getDiscountPercent, getEffectivePrice, isSaleActive } from '@/lib/pricing';

// Función mágica que genera las migas de pan leyendo el nombre y specs del producto
const generateBreadcrumbs = (product: any) => {
  const breadcrumbs = [];
  const name = product.name.toLowerCase();

  // 1. Determinar Padre y Categoría Principal
  if (product.category === 'CPU') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/cpu', label: 'Procesadores' });
    if (name.includes('amd') || name.includes('ryzen')) breadcrumbs.push({ url: '/categoria/cpu/amd', label: 'AMD' });
    if (name.includes('intel') || name.includes('core')) breadcrumbs.push({ url: '/categoria/cpu/intel', label: 'Intel' });
  } 
  else if (product.category === 'MOTHERBOARD') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/mobo', label: 'Placas Base' });
  }
  else if (product.category === 'GPU') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/graficas', label: 'Tarjetas Gráficas' });
    const chip = product.gpuSpecs?.chipset?.toLowerCase() || name;
    if (chip.includes('nvidia') || chip.includes('rtx')) breadcrumbs.push({ url: '/categoria/nvidia', label: 'NVIDIA' });
    if (chip.includes('amd') || chip.includes('radeon')) breadcrumbs.push({ url: '/categoria/amd', label: 'AMD' });
  }
  else if (product.category === 'RAM') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/ram', label: 'Memorias RAM' });
    if (product.ramSpecs?.memoryType === 'DDR4' || name.includes('ddr4')) breadcrumbs.push({ url: '/categoria/ddr4', label: 'DDR4' });
    if (product.ramSpecs?.memoryType === 'DDR5' || name.includes('ddr5')) breadcrumbs.push({ url: '/categoria/ddr5', label: 'DDR5' });
  }
  else if (product.category === 'STORAGE') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/almacenamiento', label: 'Almacenamiento' });
  }
  else if (product.category === 'MONITOR') {
    breadcrumbs.push({ url: '/categoria/perifericos', label: 'Periféricos' });
    breadcrumbs.push({ url: '/categoria/monitores', label: 'Monitores' });
  }
  else if (product.category === 'LAPTOP') {
    breadcrumbs.push({ url: '/categoria/ordenadores', label: 'Ordenadores' });
    breadcrumbs.push({ url: '/categoria/laptops', label: 'Laptops' });
  }
  else {
    // Genérico para cualquier otra cosa
    breadcrumbs.push({ url: `/categoria/${product.category.toLowerCase()}`, label: product.category });
  }

  return breadcrumbs;
};

export default function ProductPage() {
  const { id } = useParams();
  const { addItem } = useCartStore();
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;

    Promise.all([api.get(`/products/${id}`), api.get(`/products/related/${id}`)])
      .then(([productRes, relatedRes]) => {
        const currentProduct = productRes.data;
        setProduct(currentProduct);
        setRelatedProducts(Array.isArray(relatedRes.data) ? relatedRes.data : []);
      })
      .catch(err => console.error("Error al cargar producto:", err))
      .finally(() => setLoading(false));
      
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-brand-cyan"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold text-gray-800">Producto no encontrado</h1>
        <Link href="/" className="mt-4 text-brand-cyan hover:underline">Volver a la tienda</Link>
      </div>
    );
  }

  const breadcrumbs = generateBreadcrumbs(product);
  const productStock = Number(product.stock) || 0;
  const hasStock = productStock > 0;
  const specificationRows = buildSpecificationRows(product);
  const hasSale = isSaleActive(product);
  const effectivePrice = getEffectivePrice(product);
  const discountPercent = getDiscountPercent(product);

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="container mx-auto px-4 pt-6">
        
        {}
        <div className="flex items-center text-sm font-medium text-gray-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/" className="hover:text-brand-cyan hover:underline transition">Inicio</Link>
          
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center">
              <FiChevronRight className="mx-2 flex-shrink-0 text-gray-400" />
              <Link href={crumb.url} className="hover:text-brand-cyan hover:underline transition">
                {crumb.label}
              </Link>
            </div>
          ))}
          
          <FiChevronRight className="mx-2 flex-shrink-0 text-gray-400" />
          <span className="text-gray-900 font-bold max-w-[200px] sm:max-w-xs md:max-w-md truncate" title={product.name}>
            {product.name}
          </span>
        </div>

        {/* =========================================
            CONTENIDO DEL PRODUCTO
            ========================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* COLUMNA IZQUIERDA: IMÁGENES */}
          <div className="lg:col-span-7">
            <div className="border border-gray-200 rounded-2xl p-8 h-[500px] flex items-center justify-center relative mb-4">
              {product.images && product.images.length > 0 ? (
                <img 
                  src={product.images[activeImage]} 
                  alt={product.name} 
                  className="max-h-full max-w-full object-contain mix-blend-multiply"
                />
              ) : (
                <FiBox className="text-gray-200 text-9xl" />
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {product.images.map((img: string, idx: number) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImage(idx)}
                    className={`border-2 rounded-xl p-2 h-24 w-24 flex-shrink-0 transition-all ${
                      activeImage === idx ? 'border-brand-cyan shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="h-full w-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: INFORMACIÓN Y COMPRA */}
          <div className="lg:col-span-5 flex flex-col">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
              <span>SKU: {product.sku || product.id.substring(0,8).toUpperCase()}</span>
              {hasStock ? (
                <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[15px] font-black text-green-600 ring-1 ring-green-100"><FiCheck className="text-base" /> En stock</span>
              ) : (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[15px] font-black text-red-600 ring-1 ring-red-100">Sin stock</span>
              )}
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed">
              {product.description || `Excelente ${product.category.toLowerCase()} ideal para tu ensamble. Revisa las especificaciones completas para más detalles.`}
            </p>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-auto">
              <div className="mb-6">
                {hasSale ? (
                  <span className="mb-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-600">
                    -{discountPercent}% Oferta
                  </span>
                ) : null}
                <div className="flex flex-wrap items-end gap-3">
                  <p className="text-4xl md:text-[42px] font-black text-gray-900 tracking-tight">
                    S/. {effectivePrice.toFixed(2)}
                  </p>
                  {hasSale ? (
                    <p className="pb-1 text-lg font-black text-gray-400 line-through">
                      S/. {Number(product.price).toFixed(2)}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-gray-500 mt-1">Precio con IGV incluido.</p>
              </div>

              <button 
                onClick={() => {
                  if (!hasStock) return;
                  addItem(product);
                  alert('¡Producto añadido al carrito!');
                }}
                disabled={!hasStock}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-cyan py-3.5 text-base font-black text-gray-900 shadow-lg shadow-brand-cyan/30 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              >
                <FiShoppingCart size={20} />
                {hasStock ? 'Añadir al carrito' : 'Sin stock'}
              </button>
            </div>
          </div>
          
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-brand-cyan">
                  Misma categoria
                </p>
                <h2 className="text-2xl font-black text-gray-900">
                  Productos relacionados
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((item) => (
                <Link
                  key={item.id}
                  href={`/product/${item.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand-cyan/40 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-gray-50 p-3">
                    {item.images?.[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="h-full w-full object-contain mix-blend-multiply transition group-hover:scale-105"
                      />
                    ) : (
                      <FiBox className="text-5xl text-gray-200" />
                    )}
                  </div>

                  <span className="mb-2 w-max rounded bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {item.category}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-bold leading-tight text-gray-800 transition group-hover:text-brand-cyan">
                    {item.name}
                  </h3>
                  <p className="mt-auto pt-4 text-lg font-black text-brand-cyan">
                    S/. {getEffectivePrice(item).toFixed(2)}
                    {isSaleActive(item) ? (
                      <span className="ml-2 align-middle text-xs font-black text-red-500">
                        -{getDiscountPercent(item)}%
                      </span>
                    ) : null}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-black text-gray-900">
            Especificaciones de {product.name}
          </h2>

          {specificationRows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-2 bg-gray-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white sm:px-6">
                <span>Especificacion</span>
                <span>Detalle</span>
              </div>

              <div className="divide-y divide-gray-100">
                {specificationRows.map((row, index) => (
                  <div
                    key={`${row.label}-${row.value}`}
                    className={`grid grid-cols-1 gap-1 px-4 py-4 sm:grid-cols-2 sm:px-6 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-bold text-gray-700">{row.label}</span>
                    <span className="text-sm font-medium text-gray-600">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm font-medium text-gray-500">
              Este producto aun no cuenta con especificaciones tecnicas registradas.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
