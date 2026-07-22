'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiShoppingCart } from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { getDiscountPercent, getEffectivePrice, isSaleActive } from '@/lib/pricing';
import { getProductPrimaryImage } from '@/lib/product-images';
import { getCanonicalProductPath } from '@/lib/product-url';

type HomeProductCarouselProps = {
  title: string;
  products: any[];
  link: string;
  maxItems?: number;
};

export default function HomeProductCarousel({
  title,
  products,
  link,
  maxItems = 15,
}: HomeProductCarouselProps) {
  const { addItem } = useCartStore();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const visibleProducts = products.slice(0, maxItems);
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
    <section>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-2">
        <h2 className="border-l-4 border-brand-cyan pl-3 text-2xl font-bold text-gray-800">
          {title}
        </h2>
        <Link
          href={link}
          className="flex items-center text-sm font-bold text-brand-cyan hover:underline"
        >
          Ver más <FiChevronRight />
        </Link>
      </div>

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
          {visibleProducts.map((product) => {
            const hasStock = Number(product.stock) > 0;
            const productPath = getCanonicalProductPath(product);
            const productImage = getProductPrimaryImage(product);

            return (
              <article
                key={product.id}
                className="group flex min-h-[390px] w-[82vw] flex-none snap-start flex-col border border-gray-300 bg-gray-50 p-4 transition-colors hover:border-gray-500 sm:w-[46vw] lg:w-[24%] xl:w-[23%]"
              >
                <Link
                  href={productPath}
                  className="relative flex h-44 items-center justify-center bg-transparent p-3 md:h-52"
                >
                  <img
                    src={productImage}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                  />

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
                    {product.category}
                  </span>

                  <Link href={productPath}>
                    <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-gray-800 transition-colors group-hover:text-brand-cyan">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <div className="min-w-0">
                      {isSaleActive(product) ? (
                        <div className="mb-1 flex flex-wrap items-center gap-2">
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
                      type="button"
                      aria-label={`Agregar ${product.name} al carrito`}
                      onClick={() => {
                        addItem(product);
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
    </section>
  );
}
