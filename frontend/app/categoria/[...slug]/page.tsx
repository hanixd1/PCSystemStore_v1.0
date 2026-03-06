'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { FiChevronRight, FiShoppingCart, FiBox, FiFilter } from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';

const DICTIONARY: Record<string, string> = {
  'componentes': 'Todos los Componentes', 'ordenadores': 'Ordenadores', 'perifericos': 'Periféricos', 'audio': 'Audio y Sonido',
  'cpu': 'Procesadores', 'intel': 'Intel', 'amd': 'AMD',
  'mobo': 'Placas Base', 'graficas': 'Tarjetas Gráficas', 'nvidia': 'NVIDIA',
  'ram': 'Memorias RAM', 'ddr4': 'DDR4', 'ddr5': 'DDR5',
  'almacenamiento': 'Almacenamiento', 'solido': 'Discos Sólidos (M.2 / NVMe)', 'sata': 'Discos SATA / HDD', 'externo': 'Discos Externos',
  'torres': 'Torres y Gabinetes', 'cfuente': 'Con Fuente', 'sfuente': 'Sin Fuente',
  'fuentes': 'Fuentes de Poder', 'certificada': 'Certificadas (80+)', 'real': 'Reales / Genéricas',
  'refrigeracion': 'Refrigeración', 'liquida': 'Líquida (AIO)', 'torre': 'De Torre (Aire)',
  'pcs': 'PCs de Escritorio', 'pc-oficina': 'PCs para Oficina', 'pc-gaming': 'PCs Gaming',
  'laptops': 'Laptops', 'laptop-oficina': 'Laptops para Oficina', 'laptop-gaming': 'Laptops Gaming',
  'software': 'Software', 'antivirus': 'Antivirus', 'licencias': 'Licencias',
  'laptop-accessorios': 'Accesorios para Laptops', 'cables': 'Cables y Conectividad', 'mochilas': 'Mochilas',
  'monitores': 'Monitores', 'monitores-gamer': 'Monitores Gamer',
  'teclados': 'Teclados', 'teclados-gamer': 'Teclados Gamer',
  'mouse': 'Mouse', 'mouse-gamer': 'Mouse Gamer',
  'chairs': 'Sillas Gaming', 'webcams': 'Webcams', 'capturadoras': 'Capturadoras',
  'proteccion': 'Protección Eléctrica', 'ups': 'UPS', 'supresores': 'Supresores de Picos', 'estabilizadores': 'Estabilizadores',
  'audifonos': 'Audífonos', 'headsets-cableados': 'Audífonos Cableados', 'headsets-inalambricos': 'Audífonos Inalámbricos',
  'speakers': 'Parlantes', 'microphones': 'Micrófonos',
  'adapters': 'Adaptadores', 'hdmi': 'Cables HDMI', 'dp': 'Cables DisplayPort', 'ethernet': 'Cables de Red'
};

// ================================================================
// HELPERS SÚPER ROBUSTOS
// ================================================================
type FilterFn = (p: any) => boolean;

const get = (p: any, specsKey: string, field: string): any => p[specsKey]?.[field] ?? p[field];
const isTrue = (val: any) => val === true || val === 'true';
const isFalse = (val: any) => val === false || val === 'false';

// Helper inc: Busca palabras clave. Si no hay valor, no explota.
const inc = (val: any, text: string) => {
  if (!val) return false;
  return String(val).toLowerCase().includes(text.toLowerCase());
};

// ================================================================
// MAPA DE FILTROS INTELIGENTE
// ================================================================
const FILTER_MAP: Record<string, FilterFn> = {
  // CATEGORÍAS PADRE
  'componentes': (p) => ['CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'PSU', 'CASE', 'COOLER', 'STORAGE'].includes(p.category),
  'ordenadores': (p) => ['LAPTOP', 'PC_DESKTOP', 'SOFTWARE', 'BAG'].includes(p.category) || inc(p.category, 'LAPTOP_ACCESSORY'),
  'perifericos': (p) => ['MONITOR', 'KEYBOARD', 'MOUSE', 'CHAIR', 'WEBCAM', 'CAPTURE_CARD', 'UPS', 'SURGE_PROTECTOR', 'STABILIZER'].includes(p.category),
  'audio': (p) => ['HEADSET', 'SPEAKER', 'MICROPHONE'].includes(p.category),

  // COMPONENTES
  'cpu': (p) => p.category === 'CPU',
  'cpu/intel': (p) => p.category === 'CPU' && (inc(p.name,'intel') || inc(p.name,'core')),
  'cpu/amd': (p) => p.category === 'CPU' && (inc(p.name,'amd') || inc(p.name,'ryzen')),
  
  'mobo': (p) => p.category === 'MOTHERBOARD',
  'mobo/intel': (p) => p.category === 'MOTHERBOARD' && (inc(get(p,'motherboardSpecs','socket'), 'LGA') || inc(p.name, 'intel')),
  'mobo/amd': (p) => p.category === 'MOTHERBOARD' && (inc(get(p,'motherboardSpecs','socket'), 'AM') || inc(p.name, 'amd')),

  'graficas': (p) => p.category === 'GPU',
  'nvidia': (p) => p.category === 'GPU' && (inc(get(p,'gpuSpecs','chipset'), 'nvidia') || inc(get(p,'gpuSpecs','chipset'), 'geforce') || inc(p.name,'nvidia') || inc(p.name,'rtx') || inc(p.name,'gtx')),
  'amd': (p) => p.category === 'GPU' && (inc(get(p,'gpuSpecs','chipset'), 'amd') || inc(get(p,'gpuSpecs','chipset'), 'radeon') || inc(p.name,'radeon') || inc(p.name,'rx')),

  'ram': (p) => p.category === 'RAM',
  'ddr4': (p) => p.category === 'RAM' && (inc(get(p,'ramSpecs','memoryType'), 'DDR4') || inc(p.name,'ddr4')),
  'ddr5': (p) => p.category === 'RAM' && (inc(get(p,'ramSpecs','memoryType'), 'DDR5') || inc(p.name,'ddr5')),

  'almacenamiento': (p) => p.category === 'STORAGE',
  'solido': (p) => p.category === 'STORAGE' && (inc(get(p,'storageSpecs','type'), 'NVMe') || inc(get(p,'storageSpecs','type'), 'M.2') || inc(get(p,'storageSpecs','type'), 'SSD') || inc(p.name,'m.2') || inc(p.name,'nvme') || inc(p.name,'ssd')),
  'sata': (p) => p.category === 'STORAGE' && (inc(get(p,'storageSpecs','type'), 'SATA') || inc(get(p,'storageSpecs','type'), 'HDD') || inc(p.name,'sata') || inc(p.name,'hdd')),
  'externo': (p) => p.category === 'STORAGE' && inc(p.name,'externo'),

  'torres': (p) => p.category === 'CASE',
  'cfuente': (p) => p.category === 'CASE' && isTrue(get(p,'caseSpecs','includesPsu')),
  'sfuente': (p) => p.category === 'CASE' && isFalse(get(p,'caseSpecs','includesPsu')),

  'fuentes': (p) => p.category === 'PSU',
  'certificada': (p) => p.category === 'PSU' && get(p,'psuSpecs','certification') && !inc(get(p,'psuSpecs','certification'), 'sin'),
  'real': (p) => p.category === 'PSU' && (!get(p,'psuSpecs','certification') || inc(get(p,'psuSpecs','certification'), 'sin') || inc(p.name, 'generica') || inc(p.name, 'real')),

  'refrigeracion': (p) => p.category === 'COOLER',
  'liquida': (p) => p.category === 'COOLER' && (inc(get(p,'coolerSpecs','type'), 'AIO') || inc(p.name,'aio') || inc(p.name,'liquid') || inc(p.name, 'líquida')),
  'torre': (p) => p.category === 'COOLER' && (inc(get(p,'coolerSpecs','type'), 'AIR') || inc(p.name,'torre') || inc(p.name,'aire')),

  // ORDENADORES
  'pcs': (p) => p.category === 'PC_DESKTOP',
  'pc-oficina': (p) => p.category === 'PC_DESKTOP' && isFalse(get(p,'desktopSpecs','hasDedicatedGpu')),
  'pc-gaming': (p) => p.category === 'PC_DESKTOP' && isTrue(get(p,'desktopSpecs','hasDedicatedGpu')),

  'laptops': (p) => p.category === 'LAPTOP',
  'laptop-oficina': (p) => p.category === 'LAPTOP' && isFalse(get(p,'laptopSpecs','hasDedicatedGpu')),
  'laptop-gaming': (p) => p.category === 'LAPTOP' && isTrue(get(p,'laptopSpecs','hasDedicatedGpu')),

  'software': (p) => p.category === 'SOFTWARE',
  'antivirus': (p) => p.category === 'SOFTWARE' && inc(p.name,'antivirus'),
  'licencias': (p) => p.category === 'SOFTWARE' && (inc(p.name,'licencia') || inc(p.name,'windows') || inc(p.name,'office')),

  'laptop-accessorios': (p) => p.category === 'LAPTOP_ACCESSORY' || inc(p.name, 'accesorio'),
  
  // PERIFÉRICOS & OTROS
  'cables': (p) => p.category === 'CABLE' || inc(p.name, 'cable'),
  'adapters': (p) => p.category === 'CABLE' && (inc(p.name,'adaptador') || inc(p.name,'adapter')),
  'cables/hdmi': (p) => p.category === 'CABLE' && inc(p.name,'hdmi'),
  'cables/dp': (p) => p.category === 'CABLE' && (inc(p.name,'displayport') || inc(p.name,' dp')),
  'cables/ethernet': (p) => p.category === 'CABLE' && (inc(p.name,'ethernet') || inc(p.name,'rj45') || inc(p.name,'red')),
  'mochilas': (p) => p.category === 'BAG' || inc(p.name, 'mochila'),

  'monitores': (p) => p.category === 'MONITOR',
  'monitores-gamer': (p) => p.category === 'MONITOR' && (Number(get(p,'monitorSpecs','refreshRate') ?? 0) > 60 || inc(p.name,'gamer') || inc(p.name,'gaming')),

  'teclados': (p) => p.category === 'KEYBOARD',
  'teclados-gamer': (p) => p.category === 'KEYBOARD' && (inc(p.name,'gamer') || inc(p.name,'gaming') || inc(p.name,'mecánico') || isTrue(get(p,'keyboardSpecs','hasRGB'))),

  'mouse': (p) => p.category === 'MOUSE',
  'mouse-gamer': (p) => p.category === 'MOUSE' && (inc(p.name,'gamer') || inc(p.name,'gaming') || isTrue(get(p,'mouseSpecs','hasRGB'))),

  'chairs': (p) => p.category === 'CHAIR' || inc(p.name, 'silla'),
  'webcams': (p) => p.category === 'WEBCAM' || inc(p.name, 'camara') || inc(p.name, 'webcam'),
  'capturadoras': (p) => p.category === 'CAPTURE_CARD' || inc(p.name, 'capturadora'),

  'proteccion': (p) => ['UPS', 'SURGE_PROTECTOR', 'STABILIZER'].includes(p.category) || inc(p.name, 'ups') || inc(p.name, 'estabilizador') || inc(p.name, 'supresor'),
  'ups': (p) => p.category === 'UPS' || inc(p.name, 'ups'),
  'supresores': (p) => p.category === 'SURGE_PROTECTOR' || inc(p.name, 'supresor'),
  'estabilizadores': (p) => p.category === 'STABILIZER' || inc(p.name, 'estabilizador'),

  'audifonos': (p) => p.category === 'HEADSET',
  'headsets-cableados': (p) => p.category === 'HEADSET' && (inc(get(p,'headsetSpecs','connection'),'usb') || inc(get(p,'headsetSpecs','connection'),'jack') || inc(get(p,'headsetSpecs','connection'),'cable') || inc(p.name,'cableado')),
  'headsets-inalambricos': (p) => p.category === 'HEADSET' && (inc(get(p,'headsetSpecs','connection'),'inalámbrico') || inc(get(p,'headsetSpecs','connection'),'bluetooth') || inc(get(p,'headsetSpecs','connection'),'2.4ghz') || inc(p.name,'inalambrico') || inc(p.name,'wireless')),
  
  'speakers': (p) => p.category === 'SPEAKER' || inc(p.name, 'parlante'),
  'microphones': (p) => p.category === 'MICROPHONE' || inc(p.name, 'microfono'),
};

export default function CategoryPage() {
  const params = useParams();
  const { addItem } = useCartStore();

  const slugArray = Array.isArray(params?.slug) ? params.slug : [];
  
  // Unimos la ruta exacta para buscar (ej: "ram/ddr5" o "cpu/amd")
  const fullSlug = slugArray.map(s => s.toLowerCase()).join('/');
  
  // Obtenemos solo la última palabra (ej: "ddr5" o "nvidia")
  const lastSlug = slugArray[slugArray.length - 1]?.toLowerCase() || '';

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const pageTitle = DICTIONARY[lastSlug] || DICTIONARY[fullSlug] || lastSlug;

  useEffect(() => {
    if (!fullSlug) return;

    setLoading(true);
    axios.get('https://pcsystemstore.onrender.com')
      .then(res => {
        const allProducts: any[] = res.data;
        
        // 1. Buscamos primero la ruta completa (ej: cpu/amd)
        let filterFn = FILTER_MAP[fullSlug];
        
        // 2. Si no la encuentra, buscamos por la última palabra (ej: nvidia)
        if (!filterFn) filterFn = FILTER_MAP[lastSlug];

        if (filterFn) {
          setProducts(allProducts.filter(filterFn));
        } else {
          // Salvavidas final si no hay filtro configurado
          setProducts(allProducts.filter(p =>
            p.category.toLowerCase() === lastSlug || p.name.toLowerCase().includes(lastSlug)
          ));
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [fullSlug]);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">

      {/* HEADER Y BREADCRUMBS */}
      <div className="bg-white border-b border-gray-200 pt-8 pb-8 shadow-sm">
        <div className="container mx-auto px-4">

          <div className="flex items-center text-sm font-bold text-gray-400 mb-4 capitalize overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-brand-cyan transition">Inicio</Link>

            {slugArray.map((slug, index) => {
              const isLast = index === slugArray.length - 1;
              const href = `/categoria/${slugArray.slice(0, index + 1).join('/')}`;
              return (
                <div key={slug} className="flex items-center">
                  <FiChevronRight className="mx-2 flex-shrink-0" />
                  {isLast ? (
                    <span className="text-gray-900 capitalize">
                      {DICTIONARY[slug.toLowerCase()] || slug}
                    </span>
                  ) : (
                    <Link href={href} className="hover:text-brand-cyan transition capitalize">
                      {DICTIONARY[slug.toLowerCase()] || slug}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-end">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 capitalize tracking-tight flex items-center gap-3">
              <FiFilter className="text-brand-cyan" /> {pageTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="container mx-auto px-4 mt-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-brand-cyan"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center max-w-2xl mx-auto mt-10">
            <FiBox className="mx-auto text-6xl text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Aún no hay stock</h2>
            <p className="text-gray-500 mb-6">
              No se encontraron productos para "{pageTitle}". Estamos reponiendo inventario.
            </p>
            {slugArray.length > 1 ? (
              <Link
                href={`/categoria/${slugArray[0]}`}
                className="bg-brand-cyan text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-cyan-400 transition"
              >
                Ver todo en {DICTIONARY[slugArray[0].toLowerCase()] || slugArray[0]}
              </Link>
            ) : (
              <Link href="/" className="bg-brand-cyan text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-cyan-400 transition">
                Volver a la tienda
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col overflow-hidden group"
              >
                {/* 1. ENLACE DE LA IMAGEN (CORREGIDO) */}
                <Link
                  href={`/product/${product.id}`}
                  className="block relative h-56 p-6 bg-white flex items-center justify-center border-b border-gray-50"
                >
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
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    {product.category}
                  </span>
                  
                  {/* 2. ENLACE DEL TÍTULO (CORREGIDO) */}
                  <Link href={`/product/${product.id}`}>
                    <h3 className="font-bold text-sm text-gray-800 leading-tight mb-4 hover:text-brand-cyan transition line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="mt-auto flex items-end justify-between pt-4 border-t border-gray-100">
                    <p className="text-xl font-black text-gray-900">S/. {Number(product.price).toFixed(2)}</p>
                    <button
                      onClick={() => {
                        addItem(product);
                        alert('Añadido al carrito 🛒');
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
      </div>
    </div>
  );
}