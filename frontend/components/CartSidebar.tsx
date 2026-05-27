'use client';

import { useRouter } from 'next/navigation';
import { FiMinus, FiPlus, FiShoppingBag, FiTrash2, FiX } from 'react-icons/fi';
import { useCustomerSession } from '@/lib/customerSession';
import { getProductPrimaryImage } from '@/lib/product-images';
import { MAX_CART_ITEM_QUANTITY, useCartStore } from '@/store/useCartStore';

export default function CartSidebar() {
  const { isCartOpen, items, closeCart, removeItem, updateQuantity } = useCartStore();
  const router = useRouter();
  const { customer, isCheckingCustomer } = useCustomerSession();
  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar carrito"
        className={`fixed inset-0 z-50 border-0 bg-black/60 p-0 transition-opacity duration-300 ${
          isCartOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        onClick={closeCart}
      />

      <div
        className={`fixed right-0 top-0 z-[60] flex h-full w-full transform flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:w-[450px] ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b bg-white p-6">
          <h2 className="flex items-center gap-3 text-xl font-black text-gray-900">
            <FiShoppingBag className="text-brand-cyan" />
            Mi Carrito ({items.length})
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Cerrar carrito"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-white p-6">
          {items.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <p>Tu carrito está vacío</p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-4 font-bold text-brand-cyan hover:underline"
              >
                Ir a comprar
              </button>
            </div>
          ) : (
            items.map((item) => {
              const imageUrl = getProductPrimaryImage(item);

              return (
                <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-6">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center border border-gray-200 bg-gray-50 p-2">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-center text-[11px] font-bold text-gray-400">
                        Sin imagen
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-bold leading-tight text-gray-900">
                        {item.name}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-400 transition hover:text-red-600"
                        title="Eliminar producto"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>

                    <div className="mt-2 flex items-end justify-between">
                      <div className="flex items-center rounded-lg border border-gray-300 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="rounded-l-lg px-2 py-1 text-gray-600 transition hover:bg-gray-50 hover:text-brand-cyan"
                          aria-label={`Reducir cantidad de ${item.name}`}
                        >
                          <FiMinus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-gray-900">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={item.qty >= MAX_CART_ITEM_QUANTITY}
                          title={
                            item.qty >= MAX_CART_ITEM_QUANTITY
                              ? 'Límite máximo de 10 unidades por producto'
                              : 'Aumentar cantidad'
                          }
                          className="rounded-r-lg px-2 py-1 text-gray-600 transition hover:bg-gray-50 hover:text-brand-cyan disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
                          aria-label={`Aumentar cantidad de ${item.name}`}
                        >
                          <FiPlus size={14} />
                        </button>
                      </div>

                      <span className="text-lg font-black text-brand-cyan">
                        S/. {(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t bg-gray-50 p-6">
            <div className="mb-4 flex justify-between text-gray-600">
              <span className="font-medium text-gray-700">Subtotal (sin envío)</span>
              <span className="text-xl font-black text-gray-900">S/. {subtotal.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                closeCart();
                router.push(customer ? '/checkout' : '/auth/login?redirect=/checkout');
              }}
              className="w-full rounded-xl bg-brand-cyan py-4 text-lg font-bold text-white shadow-lg shadow-brand-cyan/20 transition hover:bg-[#00b89c]"
            >
              Procesar Pedido
            </button>
            {!isCheckingCustomer && !customer ? (
              <p className="mt-3 text-center text-xs font-bold text-gray-500">
                Para proteger tu compra, inicia sesión antes de continuar.
              </p>
            ) : null}
            <button
              type="button"
              onClick={closeCart}
              className="mt-4 w-full text-center text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
