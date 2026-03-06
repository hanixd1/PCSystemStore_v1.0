import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  image?: string;
}

interface CartState {
  isCartOpen: boolean;
  items: CartItem[]; 
  
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, change: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      isCartOpen: false,
      items: [],

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (newItem) => set((state) => {
        // Si ya existe, solo sumamos 1 a la cantidad
        const existingItem = state.items.find(i => i.id === newItem.id);
        if (existingItem) {
          return {
            items: state.items.map(i => 
              i.id === newItem.id ? { ...i, qty: i.qty + 1 } : i
            ),
            isCartOpen: true // Abrimos el carrito al agregar
          };
        }
        // Si no existe, lo agregamos
        return { items: [...state.items, { ...newItem, qty: 1 }], isCartOpen: true };
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),

      updateQuantity: (id, change) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === id) {
            const newQty = item.qty + change;
            return newQty > 0 ? { ...item, qty: newQty } : item;
          }
          return item;
        })
      })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'pc-system-cart', // Nombre para guardar en el navegador
      partialize: (state) => ({ items: state.items }), 
    }
  )
);