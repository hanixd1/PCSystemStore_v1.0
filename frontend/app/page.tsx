'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiShoppingCart, FiChevronRight } from 'react-icons/fi';
import { MdLaptopMac, MdComputer, MdMonitor, MdMouse, MdBuild, MdLocalOffer } from 'react-icons/md';

import { useCartStore } from '@/store/useCartStore';
import { api } from '@/lib/api';
import { getDiscountPercent, getEffectivePrice, isSaleActive } from '@/lib/pricing';

const HeroCarousel = dynamic(() => import('@/components/HeroCarousel'));

// --- COMPONENTE DE SECCIÓN DE PRODUCTOS (Reutilizable) ---
const ProductSection = ({
  title,
  products,
  link,
}: {
  title: string;
  products: any[];
  link?: string;
}) => {
  const { addItem } = useCartStore();

  if (!products || products.length === 0) return null;

  return (
    <section>
      <div className="flex justify-between items-end mb-6 pb-2 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-brand-cyan pl-3">
          {title}
        </h2>
        <Link
          href={link || '/catalogo'}
          className="text-brand-cyan font-bold text-sm hover:underline flex items-center"
        >
          Ver más <FiChevronRight />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col overflow-hidden group"
          >
            {/* IMAGEN: Aquí se corrigió para que use solo product.id */}
            <Link
              href={`/product/${product.id}`}
              className="block relative h-64 p-6 bg-gray-50 flex items-center justify-center"
            >
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-full object-contain group-hover:scale-110 transition duration-500"
                />
              ) : (
                <div className="text-gray-300 font-bold text-4xl">No Img</div>
              )}

              {product.stock <= 0 && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm z-10">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-sm border-2 border-gray-400 px-4 py-2 rounded">
                    Agotado
                  </span>
                </div>
              )}
            </Link>

            {/* INFO */}
            <div className="p-5 flex-1 flex flex-col">
              <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider mb-2">
                {product.category}
              </span>

              {/* TÍTULO: Aquí se corrigió para que use solo product.id */}
              <Link href={`/product/${product.id}`}>
                <h3 className="font-bold text-gray-800 leading-tight mb-4 hover:text-brand-cyan transition line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </h3>
              </Link>

              <div className="mt-auto flex items-end justify-between">
                <div>
                  {isSaleActive(product) ? (
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">
                        -{getDiscountPercent(product)}%
                      </span>
                      <span className="text-xs font-bold text-gray-400 line-through">
                        S/. {Number(product.price).toFixed(2)}
                      </span>
                    </div>
                  ) : null}
                  <p className="text-2xl font-black text-gray-900">
                    S/. {getEffectivePrice(product).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    addItem(product);
                    alert('Añadido al carrito');
                  }}
                  disabled={product.stock <= 0}
                  className="bg-gray-900 text-white p-3 rounded-lg hover:bg-brand-cyan hover:text-black transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group-active:scale-95"
                >
                  <FiShoppingCart className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CATEGORÍAS CON ÍCONOS Y RUTAS INTEGRADAS
  const categories = [
    { name: 'Laptops', icon: <MdLaptopMac />, href: '/categoria/laptops' },
    { name: 'PC Gamer', icon: <MdComputer />, href: '/categoria/pc-gaming' },
    { name: 'Monitores', icon: <MdMonitor />, href: '/categoria/monitores' },
    { name: 'Periféricos', icon: <MdMouse />, href: '/categoria/perifericos' },
    { name: 'Componentes', icon: <MdBuild />, href: '/categoria/componentes' },
    { name: 'Ofertas', icon: <MdLocalOffer />, href: '/ofertas' }, // Ofertas puede llevar a una URL especial
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        setProducts(res.data);
      } catch (error) {
        console.error('Error cargando productos de la API:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const cpuProducts = products.filter((p) => p.category === 'CPU').slice(0, 4);
  const moboProducts = products.filter((p) => p.category === 'MOTHERBOARD').slice(0, 4);
  const gpuProducts = products.filter((p) => p.category === 'GPU').slice(0, 4);
  const periProducts = products
    .filter((p) =>
      [
        'MOUSE',
        'KEYBOARD',
        'HEADSET',
        'MONITOR',
        'MOUSEPAD',
        'WEBCAM',
        'CAPTURE_CARD',
        'CABLE_HUB',
        'PERIPHERAL',
      ].includes(p.category),
    )
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <HeroCarousel />

      {/* --- CATEGORÍAS RÁPIDAS CLICKEABLES --- */}
      <div className="relative z-20 bg-cyan-700 pt-6 pb-16 -mt-2 mb-12">
        <div className="container mx-auto px-4">
          <div className="bg-cyan-500 rounded-xl shadow-2xl shadow-cyan-900/25 p-4 grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 border-t-4 border-cyan-300">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="flex flex-col items-center justify-center p-3
                  hover:bg-cyan-700/60
                  rounded-lg cursor-pointer transition
                  group border border-transparent
                  hover:border-cyan-600/40"
              >
                <span className="text-4xl mb-2 text-white group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="text-[10px] md:text-xs font-black text-white uppercase text-center">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      </div>

      {/* --- CONTENIDO DE PRODUCTOS --- */}
      <div className="container mx-auto px-4 space-y-16">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando catálogo...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow">
            <p className="text-xl font-bold text-gray-400">
              No hay productos disponibles por el momento.
            </p>
            <Link
              href="/admin/add-product"
              className="text-cyan-600 font-bold hover:underline mt-2 inline-block"
            >
              Ir a agregar productos
            </Link>
          </div>
        ) : (
          <>
            <ProductSection title="Procesadores" products={cpuProducts} link="/categoria/cpu" />
            <ProductSection
              title="Placas Base Recomendadas"
              products={moboProducts}
              link="/categoria/mobo"
            />
            <ProductSection
              title="Tarjetas Gráficas"
              products={gpuProducts}
              link="/categoria/graficas"
            />
            <ProductSection
              title="Periféricos"
              products={periProducts}
              link="/categoria/perifericos"
            />
          </>
        )}
      </div>
    </div>
  );
}
