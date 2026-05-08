'use client';

import { useEffect, useRef } from 'react';
import {
  CART_STORAGE_KEY,
  MAX_CART_ITEM_QUANTITY,
  type CartItem,
  useCartStore,
} from '@/store/useCartStore';
import { useCustomerSession } from '@/lib/customerSession';

function normalizeItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is CartItem => {
      const candidate = item as CartItem;
      return Boolean(candidate?.id && candidate.name && Number.isFinite(Number(candidate.price)));
    })
    .map((item) => ({
      ...item,
      price: Number(item.price),
      qty: Math.min(
        Math.max(Number.isFinite(Number(item.qty)) ? Number(item.qty) : 1, 1),
        MAX_CART_ITEM_QUANTITY,
      ),
    }));
}

export default function CartHydrator() {
  const hasHydratedRef = useRef(false);
  const items = useCartStore((state) => state.items);
  const replaceItems = useCartStore((state) => state.replaceItems);
  const { customer, isCheckingCustomer } = useCustomerSession();

  useEffect(() => {
    if (hasHydratedRef.current || isCheckingCustomer) {
      return;
    }

    hasHydratedRef.current = true;

    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as {
        items?: unknown;
        userId?: string | null;
      };

      if (parsed.userId && parsed.userId !== customer?.id) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        replaceItems([]);
        return;
      }

      replaceItems(normalizeItems(parsed.items));
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [customer?.id, isCheckingCustomer, replaceItems]);

  useEffect(() => {
    if (!hasHydratedRef.current || isCheckingCustomer) {
      return;
    }

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items, userId: customer?.id ?? null }),
    );
  }, [customer?.id, isCheckingCustomer, items]);

  return null;
}
