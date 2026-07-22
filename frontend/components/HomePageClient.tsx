'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MdBuild, MdComputer, MdLaptopMac, MdLocalOffer, MdMonitor, MdMouse } from 'react-icons/md';
import HomeProductCarousel from '@/components/HomeProductCarousel';
import type { PublicBanner } from '@/lib/catalog-server';

const HeroCarousel = dynamic(() => import('@/components/HeroCarousel'));

export default function HomePageClient({
  initialProducts,
  initialProcessors,
  initialBanners,
}: {
  initialProducts: any[];
  initialProcessors: any[];
  initialBanners: PublicBanner[];
}) {
  const products = initialProducts;

  const categories = [
    { name: 'Laptops', icon: <MdLaptopMac />, href: '/categoria/laptops' },
    { name: 'PC Gamer', icon: <MdComputer />, href: '/categoria/pc-gaming' },
    { name: 'Monitores', icon: <MdMonitor />, href: '/categoria/monitores' },
    { name: 'Periféricos', icon: <MdMouse />, href: '/categoria/perifericos' },
    { name: 'Componentes', icon: <MdBuild />, href: '/categoria/componentes' },
    { name: 'Ofertas', icon: <MdLocalOffer />, href: '/ofertas' },
  ];

  const cpuProducts = initialProcessors;
  const moboProducts = products
    .filter((product) => product.category === 'MOTHERBOARD')
    .slice(0, 15);
  const ramProducts = products.filter((product) => product.category === 'RAM').slice(0, 15);
  const gpuProducts = products.filter((product) => product.category === 'GPU').slice(0, 15);
  const laptopProducts = products.filter((product) => product.category === 'LAPTOP').slice(0, 15);
  const periProducts = products
    .filter((product) =>
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
      ].includes(product.category),
    )
    .slice(0, 15);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <HeroCarousel initialBanners={initialBanners} />

      <div className="relative z-20 -mt-2 mb-12 bg-cyan-700 pb-16 pt-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl border-t-4 border-cyan-300 bg-cyan-500 p-4 shadow-2xl shadow-cyan-900/25 md:grid-cols-6 md:gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border border-transparent p-3 transition hover:border-cyan-600/40 hover:bg-cyan-700/60"
              >
                <span className="mb-2 text-4xl text-white transition-transform group-hover:scale-110">
                  {category.icon}
                </span>
                <span className="text-center text-[10px] font-black uppercase text-white md:text-xs">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      </div>

      <div className="container mx-auto space-y-14 px-4 md:space-y-16">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-xl font-bold text-gray-400">
              El catálogo no está disponible temporalmente.
            </p>
            <Link
              href="/tienda"
              className="mt-2 inline-block font-bold text-cyan-600 hover:underline"
            >
              Ver información de la tienda
            </Link>
          </div>
        ) : (
          <>
            <HomeProductCarousel
              title="Procesadores"
              products={cpuProducts}
              link="/categoria/cpu"
            />
            <HomeProductCarousel
              title="Placas Base Recomendadas"
              products={moboProducts}
              link="/categoria/mobo"
            />
            <HomeProductCarousel
              title="Memorias RAM"
              products={ramProducts}
              link="/categoria/ram"
            />
            <HomeProductCarousel
              title="Tarjetas Gráficas"
              products={gpuProducts}
              link="/categoria/graficas"
            />
            <HomeProductCarousel
              title="Laptops"
              products={laptopProducts}
              link="/categoria/laptops"
            />
            <HomeProductCarousel
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
