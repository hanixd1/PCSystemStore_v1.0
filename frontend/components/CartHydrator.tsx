'use client';

import { useEffect, useRef } from 'react';
import {
  CART_STORAGE_KEY,
  LEGACY_CART_STORAGE_KEYS,
  MAX_CART_ITEM_QUANTITY,
  type CartItem,
  useCartStore,
} from '@/store/useCartStore';
import { useCustomerSession } from '@/lib/customerSession';
import { getProductPrimaryImage } from '@/lib/product-images';
import { getEffectivePrice } from '@/lib/pricing';
import { fetchFreshPublicJson, PublicApiError } from '@/lib/public-api';

const CART_STORAGE_VERSION = 2;
const NON_PUBLIC_STATUSES = new Set(['INACTIVE', 'DRAFT', 'HIDDEN', 'ARCHIVED', 'DISABLED']);

type StoredCartReference = {
  id: number | string;
  qty: number;
  source?: 'builder';
};

function removeStoredCartKeys(keys: readonly string[]) {
  try {
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn('No se pudo limpiar el carrito legado del navegador.', error);
  }
}

function normalizeReferences(items: unknown): StoredCartReference[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is StoredCartReference => {
      const candidate = item as StoredCartReference;
      return Boolean(candidate?.id);
    })
    .map((item) => {
      return {
        id: item.id,
        qty: Math.min(
          Math.max(Number.isFinite(Number(item.qty)) ? Number(item.qty) : 1, 1),
          MAX_CART_ITEM_QUANTITY,
        ),
        ...(item.source === 'builder' ? { source: item.source } : {}),
      };
    });
}

function currentCartItem(product: unknown, stored: StoredCartReference): CartItem | null {
  if (!product || typeof product !== 'object' || Array.isArray(product)) return null;
  const candidate = product as Record<string, unknown>;
  const id = String(candidate.id || '').trim();
  const name = String(candidate.name || '').trim();
  const price = Number(candidate.price);
  const stock = Number(candidate.stock);
  const status = String(candidate.status || '')
    .trim()
    .toUpperCase();
  if (
    !id ||
    id !== String(stored.id) ||
    !name ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(stock) ||
    !Number.isInteger(stock) ||
    stock <= 0 ||
    candidate.isActive === false ||
    candidate.published === false ||
    Boolean(candidate.deletedAt) ||
    NON_PUBLIC_STATUSES.has(status)
  ) {
    return null;
  }

  const primaryImage = getProductPrimaryImage(candidate);
  return {
    ...candidate,
    id,
    name,
    price: getEffectivePrice(candidate),
    qty: Math.min(stored.qty, stock),
    stock,
    image: primaryImage,
    imageUrl: primaryImage,
    ...(stored.source === 'builder' ? { source: stored.source } : {}),
  } as CartItem;
}

export default function CartHydrator() {
  const hasHydratedRef = useRef(false);
  const canPersistRef = useRef(false);
  const items = useCartStore((state) => state.items);
  const replaceItems = useCartStore((state) => state.replaceItems);
  const { customer, isCheckingCustomer } = useCustomerSession();

  useEffect(() => {
    if (hasHydratedRef.current || isCheckingCustomer) {
      return;
    }

    let cancelled = false;
    const itemsAtHydrationStart = new Map(
      useCartStore.getState().items.map((item) => [String(item.id), item.qty]),
    );

    const hydrateFromCurrentCatalog = async () => {
      try {
        const storedEntry = [CART_STORAGE_KEY, ...LEGACY_CART_STORAGE_KEYS]
          .map((key) => ({ key, value: window.localStorage.getItem(key) }))
          .find((entry) => entry.value);
        if (!storedEntry?.value) {
          hasHydratedRef.current = true;
          canPersistRef.current = true;
          return;
        }

        const parsed = JSON.parse(storedEntry.value) as {
          version?: number;
          items?: unknown;
          userId?: string | null;
        };

        if (parsed.userId && parsed.userId !== customer?.id) {
          if (cancelled) return;
          hasHydratedRef.current = true;
          canPersistRef.current = true;
          removeStoredCartKeys([CART_STORAGE_KEY, ...LEGACY_CART_STORAGE_KEYS]);
          replaceItems([]);
          return;
        }

        const references = normalizeReferences(parsed.items);
        const resolved = await Promise.allSettled(
          references.map(async (reference) => {
            const product = await fetchFreshPublicJson<unknown>(
              `/products/${encodeURIComponent(String(reference.id))}`,
            );
            return currentCartItem(product, reference);
          }),
        );
        if (cancelled) return;

        const resolvedItems = resolved.flatMap((result) =>
          result.status === 'fulfilled' && result.value ? [result.value] : [],
        );
        const hasTransientFailure = resolved.some(
          (result) =>
            result.status === 'rejected' &&
            !(
              result.reason instanceof PublicApiError &&
              (result.reason.status === 404 || result.reason.status === 410)
            ),
        );
        hasHydratedRef.current = true;
        canPersistRef.current = !hasTransientFailure;
        if (!hasTransientFailure) {
          removeStoredCartKeys(LEGACY_CART_STORAGE_KEYS);
        } else {
          console.warn(
            'El carrito no se sobrescribió porque algunos productos no pudieron validarse.',
          );
        }
        const currentStoreItems = useCartStore.getState().items;
        const mergedItems = new Map(resolvedItems.map((item) => [String(item.id), item]));
        for (const currentItem of currentStoreItems) {
          const id = String(currentItem.id);
          const hydratedItem = mergedItems.get(id);
          const quantityAddedDuringHydration = Math.max(
            currentItem.qty - (itemsAtHydrationStart.get(id) ?? 0),
            0,
          );

          if (hydratedItem) {
            mergedItems.set(id, {
              ...hydratedItem,
              qty: Math.min(
                hydratedItem.qty + quantityAddedDuringHydration,
                hydratedItem.stock ?? MAX_CART_ITEM_QUANTITY,
                MAX_CART_ITEM_QUANTITY,
              ),
            });
          } else if (!itemsAtHydrationStart.has(id)) {
            mergedItems.set(id, currentItem);
          }
        }
        replaceItems([...mergedItems.values()]);
      } catch (error) {
        if (cancelled) return;
        console.warn('No se pudo rehidratar el carrito con el catálogo actual.', error);
        hasHydratedRef.current = true;
        canPersistRef.current = true;
        removeStoredCartKeys([CART_STORAGE_KEY, ...LEGACY_CART_STORAGE_KEYS]);
        replaceItems([]);
      }
    };

    void hydrateFromCurrentCatalog();

    return () => {
      cancelled = true;
    };
  }, [customer?.id, isCheckingCustomer, replaceItems]);

  useEffect(() => {
    if (!hasHydratedRef.current || !canPersistRef.current || isCheckingCustomer) {
      return;
    }

    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          version: CART_STORAGE_VERSION,
          items: items.map((item) => ({
            id: item.id,
            qty: item.qty,
            ...(item.source === 'builder' ? { source: item.source } : {}),
          })),
          userId: customer?.id ?? null,
        }),
      );
    } catch (error) {
      console.warn('No se pudo guardar el carrito en este navegador.', error);
    }
  }, [customer?.id, isCheckingCustomer, items]);

  return null;
}
