'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiChevronRight, FiShoppingCart, FiCheck, FiBox } from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { api } from '@/lib/api';

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
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    
    api.get(`/products/${id}`)
      .then(res => setProduct(res.data))
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
              {product.stock > 0 ? (
                <span className="flex items-center gap-1 text-green-600 font-bold"><FiCheck /> En stock</span>
              ) : (
                <span className="text-red-500 font-bold">Agotado</span>
              )}
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed">
              {product.description || `Excelente ${product.category.toLowerCase()} ideal para tu ensamble. Revisa las especificaciones completas para más detalles.`}
            </p>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-auto">
              <div className="mb-6">
                <p className="text-5xl font-black text-gray-900 tracking-tight">
                  S/. {Number(product.price).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Precio con IGV incluido.</p>
              </div>

              <button 
                onClick={() => {
                  addItem(product);
                  alert('¡Producto añadido al carrito!');
                }}
                disabled={product.stock <= 0}
                className="w-full flex items-center justify-center gap-2 bg-brand-cyan text-gray-900 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition shadow-lg shadow-brand-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiShoppingCart size={22} />
                {product.stock > 0 ? 'Añadir al carrito' : 'Sin stock disponible'}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
