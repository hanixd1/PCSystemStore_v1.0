import { create } from 'zustand';
import { getProductPrimaryImage } from '@/lib/product-images';

export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  category?: string;
  stock?: number;
  source?: 'builder';
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

export const CART_STORAGE_KEY = 'pc-system-cart:v2';
export const LEGACY_CART_STORAGE_KEYS = ['pc-system-cart'] as const;

export const useCartStore = create<CartState>()((set) => ({
  isCartOpen: false,
  items: [],

  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),

  addItem: (newItem) =>
    set((state) => {
      const stock = Number(newItem.stock);
      const quantityLimit =
        Number.isInteger(stock) && stock >= 0
          ? Math.min(stock, MAX_CART_ITEM_QUANTITY)
          : MAX_CART_ITEM_QUANTITY;
      if (quantityLimit === 0) {
        return state;
      }

      const normalPrice = Number(newItem.price);
      const salePrice = Number((newItem as any).salePrice);
      const effectivePrice =
        ((newItem as any).isOnSale === true || (newItem as any).isOnSale === 'true') &&
        salePrice > 0 &&
        salePrice < normalPrice
          ? salePrice
          : normalPrice;
      const primaryImage = getProductPrimaryImage(newItem);
      const cartItem = {
        ...newItem,
        image: primaryImage || newItem.image,
        imageUrl: primaryImage || newItem.imageUrl,
        price: effectivePrice,
        ...(Number.isInteger(stock) ? { stock } : {}),
      };
      const existingItem = state.items.find((i) => i.id === cartItem.id);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.id === cartItem.id
              ? {
                  ...i,
                  ...cartItem,
                  qty: Math.min(i.qty + 1, quantityLimit),
                }
              : i,
          ),
          isCartOpen: true,
        };
      }
      return {
        items: [
          ...state.items,
          {
            ...cartItem,
            qty: Math.min(Math.max(cartItem.qty || 1, 1), quantityLimit),
          },
        ],
        isCartOpen: true,
      };
    }),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  updateQuantity: (id, change) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id === id) {
          const newQty = item.qty + change;
          const stock = Number(item.stock);
          const quantityLimit =
            Number.isInteger(stock) && stock > 0
              ? Math.min(stock, MAX_CART_ITEM_QUANTITY)
              : MAX_CART_ITEM_QUANTITY;
          return newQty > 0 ? { ...item, qty: Math.min(newQty, quantityLimit) } : item;
        }
        return item;
      }),
    })),

  clearCart: () => set({ items: [], isCartOpen: false }),

  replaceItems: (items) => set({ items }),
}));

export function clearCartStorage() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      LEGACY_CART_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
      console.warn('No se pudo limpiar el carrito guardado.', error);
    }
  }
}

export function resetCartState() {
  useCartStore.getState().clearCart();
  clearCartStorage();
}
