'use client';

import { FiX, FiTrash2, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { MAX_CART_ITEM_QUANTITY, useCartStore } from '../store/useCartStore';
import { useRouter } from 'next/navigation';
import { useCustomerSession } from '@/lib/customerSession';

export default function CartSidebar() {
  // Traemos los datos y funciones del store actualizado
  const { isCartOpen, items, closeCart, removeItem, updateQuantity } = useCartStore();
  const router = useRouter();
  const { customer, isCheckingCustomer } = useCustomerSession();

  // Calculamos el total dinámicamente
  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);

  return (
    <>
      {/* OVERLAY (Fondo oscuro) */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${
          isCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={closeCart}
      />

      {/* PANEL LATERAL */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        
        {/* CABECERA (Texto Negro Fuerte) */}
        <div className="flex justify-between items-center p-6 border-b bg-white">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
            <FiShoppingBag className="text-brand-cyan" /> 
            Mi Cesta ({items.length})
          </h2>
          <button onClick={closeCart} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
            <FiX size={24} />
          </button>
        </div>

        {/* LISTA DE PRODUCTOS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
           {items.length === 0 ? (
             <div className="text-center py-20 text-gray-500">
               <p>Tu carrito está vacío 😔</p>
               <button onClick={closeCart} className="mt-4 text-brand-cyan font-bold hover:underline">
                 Ir a comprar
               </button>
             </div>
           ) : (
             items.map(item => (
               <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-6">
                 
                 {/* Imagen Placeholder */}
                 <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 border border-gray-200">
                    <span className="text-xs font-bold text-gray-400">IMG</span>
                 </div>
                 
                 {/* Info del Producto */}
                 <div className="flex-1 flex flex-col justify-between">
                   <div className="flex justify-between items-start gap-2">
                     {/* CORRECCIÓN DE COLOR: text-gray-900 (Negro) */}
                     <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
                       {item.name}
                     </h3>
                     
                     {/* BOTÓN ELIMINAR CONECTADO */}
                     <button 
                       onClick={() => removeItem(item.id)}
                       className="text-gray-400 hover:text-red-600 transition p-1"
                       title="Eliminar producto"
                     >
                       <FiTrash2 size={18} />
                     </button>
                   </div>
                   
                   <div className="flex justify-between items-end mt-2">
                     {/* Selector Cantidad */}
                     <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                       <button 
                         onClick={() => updateQuantity(item.id, -1)}
                         className="p-1 px-2 text-gray-600 hover:text-brand-cyan hover:bg-gray-50 rounded-l-lg transition"
                       >
                         <FiMinus size={14}/>
                       </button>
                       <span className="font-bold text-sm w-8 text-center text-gray-900">
                         {item.qty}
                       </span>
                       <button 
                         onClick={() => updateQuantity(item.id, 1)}
                         disabled={item.qty >= MAX_CART_ITEM_QUANTITY}
                         title={item.qty >= MAX_CART_ITEM_QUANTITY ? 'Limite maximo de 10 unidades por producto' : 'Aumentar cantidad'}
                         className="p-1 px-2 text-gray-600 hover:text-brand-cyan hover:bg-gray-50 rounded-r-lg transition disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
                       >
                         <FiPlus size={14}/>
                       </button>
                     </div>
                     
                     {/* PRECIO: Color Cian Oscuro para contraste */}
                     <span className="font-black text-lg text-brand-cyan">
                       S/. {(item.price * item.qty).toFixed(2)}
                     </span>
                   </div>
                 </div>
               </div>
             ))
           )}
        </div>

        {/* FOOTER TOTALES */}
        {items.length > 0 && (
          <div className="border-t p-6 bg-gray-50">
            <div className="flex justify-between mb-4 text-gray-600">
              <span className="font-medium text-gray-700">Subtotal (sin envío)</span>
              {/* TOTAL EN NEGRO */}
              <span className="font-black text-xl text-gray-900">
                S/. {subtotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => {
                closeCart();
                router.push(
                  customer
                    ? '/checkout'
                    : '/auth/login?redirect=/checkout',
                );
              }}
              className="w-full bg-brand-cyan hover:bg-[#00b89c] text-white font-bold py-4 rounded-xl transition text-lg shadow-lg shadow-brand-cyan/20"
            >
              Procesar Pedido
            </button>
            {!isCheckingCustomer && !customer ? (
              <p className="mt-3 text-center text-xs font-bold text-gray-500">
                Para proteger tu compra, inicia sesion antes de continuar.
              </p>
            ) : null}
            <button onClick={closeCart} className="w-full text-center mt-4 text-sm text-gray-500 hover:text-gray-800 font-medium">
              Seguir comprando
            </button>
          </div>
        )}

      </div>
    </>
  );
}
