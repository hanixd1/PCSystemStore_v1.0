import { create } from 'zustand';

export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  qty: number;
  image?: string;
}

export const MAX_CART_ITEM_QUANTITY = 10;

interface CartState {
  isCartOpen: boolean;
  items: CartItem[]; 
  
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: number | string) => void;
  updateQuantity: (id: number | string, change: number) => void;
  clearCart: () => void;
  replaceItems: (items: CartItem[]) => void;
}

export const CART_STORAGE_KEY = 'pc-system-cart';

export const useCartStore = create<CartState>()(
    (set) => ({
      isCartOpen: false,
      items: [],

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (newItem) => set((state) => {
        const normalPrice = Number(newItem.price);
        const salePrice = Number((newItem as any).salePrice);
        const effectivePrice =
          ((newItem as any).isOnSale === true || (newItem as any).isOnSale === 'true') && salePrice > 0 && salePrice < normalPrice
            ? salePrice
            : normalPrice;
        const cartItem = { ...newItem, price: effectivePrice };
        const existingItem = state.items.find(i => i.id === cartItem.id);
        if (existingItem) {
          return {
            items: state.items.map(i => 
              i.id === cartItem.id
                ? { ...i, qty: Math.min(i.qty + 1, MAX_CART_ITEM_QUANTITY) }
                : i
            ),
            isCartOpen: true
          };
        }
        return {
          items: [
            ...state.items,
            {
              ...cartItem,
              qty: Math.min(Math.max(cartItem.qty || 1, 1), MAX_CART_ITEM_QUANTITY),
            },
          ],
          isCartOpen: true,
        };
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),

      updateQuantity: (id, change) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === id) {
            const newQty = item.qty + change;
            return newQty > 0
              ? { ...item, qty: Math.min(newQty, MAX_CART_ITEM_QUANTITY) }
              : item;
          }
          return item;
        })
      })),

      clearCart: () => set({ items: [], isCartOpen: false }),

      replaceItems: (items) => set({ items }),
    })
);

export function clearCartStorage() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  }
}

export function resetCartState() {
  useCartStore.getState().clearCart();
  clearCartStorage();
}
