import { FiShoppingCart } from 'react-icons/fi';
import { getDiscountPercent, getEffectivePrice, isSaleActive } from '@/lib/pricing';
import { PRODUCT_IMAGE_FALLBACK, resolveImageUrl } from '@/lib/product-images';

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
  const imageSource = resolveImageUrl(image);

  return (
    <div className="group flex h-full flex-col border border-gray-300 bg-gray-50 p-4 transition-colors duration-200 hover:border-gray-500">
      {/* Badge de Categoría */}
      <span className="mb-2 self-start border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {category}
      </span>
      {hasSale ? (
        <span className="mb-2 self-start border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-600">
          -{discountPercent}%
        </span>
      ) : null}

      {/* Imagen (Placeholder elegante si no hay foto) */}
      <div className="relative mb-4 flex h-48 w-full items-center justify-center overflow-hidden bg-transparent">
        {imageSource ? (
          <img
            src={imageSource}
            alt={name}
            className="object-contain h-full w-full"
            onError={(event) => {
              if (event.currentTarget.src.endsWith(PRODUCT_IMAGE_FALLBACK)) return;
              event.currentTarget.src = PRODUCT_IMAGE_FALLBACK;
            }}
          />
        ) : (
          <div className="text-xs font-black tracking-[0.3em] text-gray-300">IMG</div>
        )}

        {/* Botón flotante de "Vista Rápida" que aparece al hover */}
        <button className="absolute bottom-2 right-2 border border-gray-300 bg-white p-2 text-brand-cyan opacity-0 transition-opacity hover:border-brand-cyan hover:bg-brand-cyan hover:text-white group-hover:opacity-100">
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

          <button className="bg-brand-dark px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-cyan hover:text-gray-950">
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
