'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdLocalOffer } from 'react-icons/md';
import { FiBox, FiShoppingCart } from 'react-icons/fi';
import { api } from '@/lib/api';
import { getDiscountPercent, getEffectivePrice, isSaleActive } from '@/lib/pricing';
import { useCartStore } from '@/store/useCartStore';

export default function OffersPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();

  useEffect(() => {
    api
      .get('/products')
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        setProducts(items.filter(isSaleActive));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) {
    return (
      <div className="min-h-[60vh] bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-3xl border border-cyan-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-50 text-5xl text-brand-cyan">
              <MdLocalOffer />
            </div>

            <h1 className="text-3xl font-black text-gray-900">No hay ofertas disponibles</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-gray-500">
              Por el momento no tenemos promociones activas. Revisa nuestro catalogo para encontrar
              productos disponibles.
            </p>

            <Link
              href="/"
              className="mt-8 inline-flex rounded-xl bg-brand-cyan px-6 py-3 text-sm font-black text-gray-900 transition hover:bg-cyan-400"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-2xl text-brand-cyan">
            <MdLocalOffer />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Ofertas disponibles</h1>
            <p className="text-sm font-semibold text-gray-500">Productos con promocion activa.</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center font-bold text-brand-cyan">
            Cargando ofertas...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-xl"
              >
                <Link
                  href={`/product/${product.id}`}
                  className="flex h-56 items-center justify-center bg-white p-6"
                >
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <FiBox className="text-6xl text-gray-200" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <span className="mb-2 w-max rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">
                    -{getDiscountPercent(product)}% Oferta
                  </span>
                  <Link
                    href={`/product/${product.id}`}
                    className="line-clamp-2 text-sm font-bold text-gray-800 hover:text-brand-cyan"
                  >
                    {product.name}
                  </Link>
                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 line-through">
                        S/. {Number(product.price).toFixed(2)}
                      </p>
                      <p className="text-xl font-black text-gray-900">
                        S/. {getEffectivePrice(product).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => addItem(product)}
                      disabled={product.stock <= 0}
                      className="rounded-xl bg-gray-900 p-2.5 text-white transition hover:bg-brand-cyan hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiShoppingCart />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
