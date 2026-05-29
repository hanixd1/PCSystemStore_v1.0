'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight, FiShoppingCart, FiCheck, FiBox } from 'react-icons/fi';
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
    if (name.includes('amd') || name.includes('ryzen'))
      breadcrumbs.push({ url: '/categoria/cpu/amd', label: 'AMD' });
    if (name.includes('intel') || name.includes('core'))
      breadcrumbs.push({ url: '/categoria/cpu/intel', label: 'Intel' });
  } else if (product.category === 'MOTHERBOARD') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/mobo', label: 'Placas Base' });
  } else if (product.category === 'GPU') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/graficas', label: 'Tarjetas Gráficas' });
    const chip = product.gpuSpecs?.chipset?.toLowerCase() || name;
    if (chip.includes('nvidia') || chip.includes('rtx'))
      breadcrumbs.push({ url: '/categoria/nvidia', label: 'NVIDIA' });
    if (chip.includes('amd') || chip.includes('radeon'))
      breadcrumbs.push({ url: '/categoria/amd', label: 'AMD' });
  } else if (product.category === 'RAM') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/ram', label: 'Memorias RAM' });
    if (product.ramSpecs?.memoryType === 'DDR4' || name.includes('ddr4'))
      breadcrumbs.push({ url: '/categoria/ddr4', label: 'DDR4' });
    if (product.ramSpecs?.memoryType === 'DDR5' || name.includes('ddr5'))
      breadcrumbs.push({ url: '/categoria/ddr5', label: 'DDR5' });
  } else if (product.category === 'STORAGE') {
    breadcrumbs.push({ url: '/categoria/componentes', label: 'Componentes' });
    breadcrumbs.push({ url: '/categoria/almacenamiento', label: 'Almacenamiento' });
  } else if (product.category === 'MONITOR') {
    breadcrumbs.push({ url: '/categoria/perifericos', label: 'Periféricos' });
    breadcrumbs.push({ url: '/categoria/monitores', label: 'Monitores' });
  } else if (product.category === 'LAPTOP') {
    breadcrumbs.push({ url: '/categoria/ordenadores', label: 'Ordenadores' });
    breadcrumbs.push({ url: '/categoria/laptops', label: 'Laptops' });
  } else {
    // Genérico para cualquier otra cosa
    breadcrumbs.push({
      url: `/categoria/${product.category.toLowerCase()}`,
      label: product.category,
    });
  }

  return breadcrumbs;
};

function getPublicProductPath(product: { id: string; slug?: string | null }) {
  return `/producto/${product.slug || product.id}`;
}

function getProductImages(product: any): string[] {
  return Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
}

function RelatedProductsCarousel({ products }: { products: any[] }) {
  const { addItem } = useCartStore();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const visibleProducts = products.slice(0, 10);
  const hasCarousel = visibleProducts.length > 1;

  const updateScrollButtons = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    setCanScrollPrev(scroller.scrollLeft > 8);
    setCanScrollNext(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 8);
  };

  useEffect(() => {
    updateScrollButtons();
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      scroller.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [visibleProducts.length]);

  const scrollProducts = (direction: 'prev' | 'next') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction === 'next' ? scroller.clientWidth * 0.9 : -scroller.clientWidth * 0.9,
      behavior: 'smooth',
    });
  };

  if (visibleProducts.length === 0) return null;

  return (
    <div className="relative">
      {hasCarousel ? (
        <button
          type="button"
          aria-label="Producto anterior"
          onClick={() => scrollProducts('prev')}
          className={`absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-800 shadow-sm transition hover:border-brand-cyan hover:text-brand-cyan md:flex ${
            canScrollPrev ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <FiChevronLeft size={22} />
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:gap-5"
      >
        {visibleProducts.map((item) => {
          const hasStock = Number(item.stock) > 0;
          const itemPath = getPublicProductPath(item);

          return (
            <article
              key={item.id}
              className="group flex min-h-[380px] w-[82vw] flex-none snap-start flex-col border border-gray-300 bg-gray-50 p-4 transition-colors hover:border-gray-500 sm:w-[46vw] lg:w-[24%] xl:w-[23%]"
            >
              <Link
                href={itemPath}
                className="relative flex h-40 items-center justify-center bg-transparent p-3 md:h-44"
              >
                {item.images?.[0] ? (
                  <img
                    src={item.images[0]}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <FiBox className="text-5xl text-gray-200" />
                )}

                {!hasStock ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/85 backdrop-blur-sm">
                    <span className="border border-gray-400 px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-500">
                      Agotado
                    </span>
                  </div>
                ) : null}
              </Link>

              <div className="flex flex-1 flex-col pt-3">
                <span className="mb-2 w-max border border-gray-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {item.category}
                </span>

                <Link href={itemPath}>
                  <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-gray-800 transition-colors group-hover:text-brand-cyan">
                    {item.name}
                  </h3>
                </Link>

                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    {isSaleActive(item) ? (
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">
                          -{getDiscountPercent(item)}%
                        </span>
                        <span className="text-xs font-bold text-gray-400 line-through">
                          S/. {Number(item.price).toFixed(2)}
                        </span>
                      </div>
                    ) : null}
                    <p className="text-xl font-black text-gray-900">
                      S/. {getEffectivePrice(item).toFixed(2)}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={`Agregar ${item.name} al carrito`}
                    onClick={() => {
                      addItem(item);
                    }}
                    disabled={!hasStock}
                    className="flex h-11 w-11 flex-none items-center justify-center bg-gray-900 text-white transition hover:bg-brand-cyan hover:text-gray-950 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    <FiShoppingCart className="text-lg" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {hasCarousel ? (
        <button
          type="button"
          aria-label="Producto siguiente"
          onClick={() => scrollProducts('next')}
          className={`absolute right-0 top-1/2 z-10 hidden h-11 w-11 translate-x-3 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-800 shadow-sm transition hover:border-brand-cyan hover:text-brand-cyan md:flex ${
            canScrollNext ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <FiChevronRight size={22} />
        </button>
      ) : null}
    </div>
  );
}

export default function ProductDetailClient({ identifier }: { identifier: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { addItem, closeCart } = useCartStore();
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isImageFading, setIsImageFading] = useState(false);
  const imageTransitionTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!identifier) return;

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setActiveImage(0);
  }, [identifier]);

  useEffect(() => {
    return () => {
      if (imageTransitionTimeout.current) {
        window.clearTimeout(imageTransitionTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!identifier) return;

    setLoading(true);
    api
      .get(`/products/resolve/${identifier}`)
      .then(async (productRes) => {
        const currentProduct = productRes.data;
        setProduct(currentProduct);
        if (currentProduct?.slug && pathname !== getPublicProductPath(currentProduct)) {
          router.replace(getPublicProductPath(currentProduct));
        }

        const relatedRes = currentProduct?.id
          ? await api.get(`/products/related/${currentProduct.id}`)
          : { data: [] };
        setRelatedProducts(Array.isArray(relatedRes.data) ? relatedRes.data : []);
      })
      .catch((err) => console.error('Error al cargar producto:', err))
      .finally(() => setLoading(false));
  }, [identifier, pathname, router]);

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
        <Link href="/" className="mt-4 text-brand-cyan hover:underline">
          Volver a la tienda
        </Link>
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
  const productImages = getProductImages(product);
  const hasMultipleImages = productImages.length > 1;
  const currentImage = productImages[activeImage] ?? productImages[0];

  const selectImage = (nextImage: number) => {
    if (!hasMultipleImages) return;
    if (nextImage === activeImage) return;

    if (imageTransitionTimeout.current) {
      window.clearTimeout(imageTransitionTimeout.current);
    }

    setIsImageFading(true);
    imageTransitionTimeout.current = window.setTimeout(() => {
      setActiveImage(nextImage);
      setIsImageFading(false);
      imageTransitionTimeout.current = null;
    }, 110);
  };

  const showPreviousImage = () => {
    if (!hasMultipleImages) return;
    selectImage(activeImage === 0 ? productImages.length - 1 : activeImage - 1);
  };

  const showNextImage = () => {
    if (!hasMultipleImages) return;
    selectImage((activeImage + 1) % productImages.length);
  };

  const handleAddToCart = () => {
    if (!hasStock) return;
    addItem(product);
  };

  const handleBuyNow = () => {
    if (!hasStock) return;
    addItem(product);
    closeCart();
    router.push('/checkout');
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="container mx-auto px-4 pt-6">
        {}
        <div className="flex items-center text-sm font-medium text-gray-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/" className="hover:text-brand-cyan hover:underline transition">
            Inicio
          </Link>

          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center">
              <FiChevronRight className="mx-2 flex-shrink-0 text-gray-400" />
              <Link href={crumb.url} className="hover:text-brand-cyan hover:underline transition">
                {crumb.label}
              </Link>
            </div>
          ))}

          <FiChevronRight className="mx-2 flex-shrink-0 text-gray-400" />
          <span
            className="text-gray-900 font-bold max-w-[200px] sm:max-w-xs md:max-w-md truncate"
            title={product.name}
          >
            {product.name}
          </span>
        </div>

        {/* =========================================
            CONTENIDO DEL PRODUCTO
            ========================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* COLUMNA IZQUIERDA: IMÁGENES */}
          <div className="lg:col-span-7">
            <div className="group relative mb-4 flex h-[360px] items-center justify-center rounded-2xl border border-gray-200 p-6 sm:h-[500px] sm:p-8">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  className={`max-h-full max-w-full object-contain mix-blend-multiply transition-all duration-200 ease-out ${
                    isImageFading ? 'scale-[0.985] opacity-0' : 'scale-100 opacity-100'
                  }`}
                />
              ) : (
                <FiBox className="text-gray-200 text-9xl" />
              )}
              {hasMultipleImages ? (
                <>
                  <button
                    type="button"
                    aria-label="Imagen anterior"
                    onClick={showPreviousImage}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-800 shadow-sm transition hover:border-brand-cyan hover:text-brand-cyan md:opacity-0 md:group-hover:opacity-100"
                  >
                    <FiChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    aria-label="Imagen siguiente"
                    onClick={showNextImage}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-800 shadow-sm transition hover:border-brand-cyan hover:text-brand-cyan md:opacity-0 md:group-hover:opacity-100"
                  >
                    <FiChevronRight size={24} />
                  </button>
                </>
              ) : null}
            </div>

            {hasMultipleImages && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {productImages.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectImage(idx)}
                    aria-label={`Ver imagen ${idx + 1}`}
                    className={`border-2 rounded-xl p-2 h-24 w-24 flex-shrink-0 transition-all ${
                      activeImage === idx
                        ? 'border-brand-cyan shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumb ${idx}`}
                      className="h-full w-full object-contain mix-blend-multiply"
                    />
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
              <span>SKU: {product.sku || product.id.substring(0, 8).toUpperCase()}</span>
              {hasStock ? (
                <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[15px] font-black text-green-600 ring-1 ring-green-100">
                  <FiCheck className="text-base" /> En stock
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[15px] font-black text-red-600 ring-1 ring-red-100">
                  Sin stock
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-5 leading-relaxed">
              {product.description ||
                `Excelente ${product.category.toLowerCase()} ideal para tu ensamble. Revisa las especificaciones completas para más detalles.`}
            </p>

            <div className="mt-2 rounded-2xl border border-gray-100 bg-gray-50 p-6">
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

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!hasStock}
                  className="w-full rounded-xl bg-brand-cyan py-3.5 text-base font-black text-gray-950 shadow-sm transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {hasStock ? 'Comprar ahora' : 'Sin stock'}
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!hasStock}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3.5 text-base font-black text-gray-900 transition hover:border-brand-cyan hover:text-brand-cyan disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <FiShoppingCart size={20} />
                  Añadir al carrito
                </button>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.filter((item) => item.id !== product.id).length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-brand-cyan">
                  Misma categoria
                </p>
                <h2 className="text-2xl font-black text-gray-900">Productos relacionados</h2>
              </div>
            </div>

            <RelatedProductsCarousel
              products={relatedProducts.filter((item) => item.id !== product.id)}
            />
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
