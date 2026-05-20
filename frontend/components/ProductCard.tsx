import { FiShoppingCart } from 'react-icons/fi';
import { getDiscountPercent, getEffectivePrice, isSaleActive } from '@/lib/pricing';

// Definimos las props para que el componente sea reutilizable
interface ProductCardProps {
  name: string;
  price: number;
  isOnSale?: boolean;
  salePrice?: number;
  image?: string;
  category: string;
}

export default function ProductCard({
  name,
  price,
  isOnSale,
  salePrice,
  image,
  category,
}: ProductCardProps) {
  const pricing = { price, isOnSale, salePrice };
  const hasSale = isSaleActive(pricing);
  const effectivePrice = getEffectivePrice(pricing);
  const discountPercent = getDiscountPercent(pricing);

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-4 transition-all duration-300 hover:shadow-xl hover:border-brand-cyan/30 flex flex-col h-full">
      {/* Badge de Categoría */}
      <span className="self-start text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded mb-2">
        {category}
      </span>
      {hasSale ? (
        <span className="mb-2 self-start rounded-full bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-600">
          -{discountPercent}%
        </span>
      ) : null}

      {/* Imagen (Placeholder elegante si no hay foto) */}
      <div className="relative w-full h-48 mb-4 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
        {image ? (
          <img src={image} alt={name} className="object-contain h-full w-full" />
        ) : (
          <div className="text-gray-300 text-4xl">📷</div>
        )}

        {/* Botón flotante de "Vista Rápida" que aparece al hover */}
        <button className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-brand-cyan hover:bg-brand-cyan hover:text-white">
          <FiShoppingCart />
        </button>
      </div>

      {/* Info del Producto */}
      <div className="mt-auto">
        <h3 className="font-bold text-gray-800 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-brand-cyan transition-colors">
          {name}
        </h3>

        <div className="flex items-end justify-between mt-2">
          <div className="flex flex-col">
            {hasSale ? (
              <span className="text-xs text-gray-400 line-through">
                S/. {Number(price).toFixed(2)}
              </span>
            ) : null}
            <span className="text-xl font-black text-brand-cyan">
              S/. {effectivePrice.toFixed(2)}
            </span>
          </div>

          <button className="bg-brand-dark text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-brand-cyan transition-colors">
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
