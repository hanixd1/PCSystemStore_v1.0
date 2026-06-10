'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdBuild, MdComputer, MdLaptopMac, MdLocalOffer, MdMonitor, MdMouse } from 'react-icons/md';
import HomeProductCarousel from '@/components/HomeProductCarousel';
import { api } from '@/lib/api';

const HeroCarousel = dynamic(() => import('@/components/HeroCarousel'));

function normalizeBrand(value: unknown) {
  const text = String(value || '')
    .trim()
    .toUpperCase();
  if (text.includes('AMD') || text.includes('RADEON')) return 'AMD';
  if (text.includes('INTEL') || text.includes('ARC')) return 'INTEL';
  if (text.includes('NVIDIA') || text.includes('GEFORCE') || text.includes('RTX')) return 'NVIDIA';
  return text || 'OTROS';
}

function getCpuBrand(product: any) {
  const source =
    product.cpuSpecs?.brand ??
    product.cpuSpecs?.marcaProcesador ??
    product.brand ??
    product.marca ??
    product.name;
  return normalizeBrand(source);
}

function balanceProductsByBrand<T>(products: T[], getBrand: (product: T) => string, maxItems = 15) {
  const groups = new Map<string, T[]>();
  for (const product of products) {
    const brand = getBrand(product);
    groups.set(brand, [...(groups.get(brand) ?? []), product]);
  }

  const preferredBrands = ['AMD', 'INTEL', 'NVIDIA'];
  const brands = [
    ...preferredBrands.filter((brand) => groups.has(brand)),
    ...Array.from(groups.keys())
      .filter((brand) => !preferredBrands.includes(brand))
      .sort(),
  ];
  const balanced: T[] = [];
  let index = 0;

  while (
    balanced.length < maxItems &&
    brands.some((brand) => (groups.get(brand)?.length ?? 0) > index)
  ) {
    for (const brand of brands) {
      const product = groups.get(brand)?.[index];
      if (product) balanced.push(product);
      if (balanced.length >= maxItems) break;
    }
    index += 1;
  }

  return balanced;
}

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { name: 'Laptops', icon: <MdLaptopMac />, href: '/categoria/laptops' },
    { name: 'PC Gamer', icon: <MdComputer />, href: '/categoria/pc-gaming' },
    { name: 'Monitores', icon: <MdMonitor />, href: '/categoria/monitores' },
    { name: 'Periféricos', icon: <MdMouse />, href: '/categoria/perifericos' },
    { name: 'Componentes', icon: <MdBuild />, href: '/categoria/componentes' },
    { name: 'Ofertas', icon: <MdLocalOffer />, href: '/ofertas' },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        setProducts(Array.isArray(res.data) ? res.data : res.data?.items || []);
      } catch (error) {
        console.error('Error cargando productos de la API:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchProducts();
  }, []);

  const cpuProducts = balanceProductsByBrand(
    products.filter((product) => product.category === 'CPU'),
    getCpuBrand,
    15,
  );
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
      <HeroCarousel />

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
        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-cyan-500"></div>
            <p className="text-gray-500">Cargando catálogo...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-xl font-bold text-gray-400">
              No hay productos disponibles por el momento.
            </p>
            <Link
              href="/admin/add-product"
              className="mt-2 inline-block font-bold text-cyan-600 hover:underline"
            >
              Ir a agregar productos
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
