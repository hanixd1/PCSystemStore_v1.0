'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ProductFormData } from './productFormState';

const DRAFT_PREFIX = 'pcs:product-draft:';
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_SAVE_DELAY_MS = 600;

export type ProductDraft = { savedAt: string; data: ProductFormData };

function readDraft(key: string): ProductDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ProductDraft;
    if (!draft?.data || Date.now() - Date.parse(draft.savedAt) > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(DRAFT_PREFIX + key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

/**
 * Autosaves the form fields (not the image files) so an expired session, a closed tab or a
 * failed request never loses the admin's work. The caller decides whether to restore.
 */
export function useProductDraft(key: string, formData: ProductFormData, isDirty: boolean) {
  // Admin pages render only on the client (after the session check), so storage is available.
  const [pendingDraft, setPendingDraft] = useState<ProductDraft | null>(() =>
    typeof window === 'undefined' ? null : readDraft(key),
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    // Do not overwrite a stored draft before the admin decided whether to restore it.
    if (pendingDraft || !isDirty) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      try {
        window.localStorage.setItem(
          DRAFT_PREFIX + key,
          JSON.stringify({ savedAt, data: formData }),
        );
        setLastSavedAt(savedAt);
      } catch {
        // Storage full or disabled: the form keeps working without autosave.
      }
    }, DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key, formData, isDirty, pendingDraft]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(DRAFT_PREFIX + key);
    } catch {
      // Ignore storage errors.
    }
    setPendingDraft(null);
    setLastSavedAt(null);
  }, [key]);

  const dismissPendingDraft = useCallback(() => setPendingDraft(null), []);

  return { pendingDraft, dismissPendingDraft, clearDraft, lastSavedAt };
}

const SESSION_WARNING_MS = 15 * 60 * 1000;

function readSessionExpiry(): number | null {
  try {
    const user = JSON.parse(window.localStorage.getItem('adminUser') ?? 'null') as {
      sessionExpiresAt?: string | null;
    } | null;
    const expiresAt = Date.parse(user?.sessionExpiresAt ?? '');
    return Number.isFinite(expiresAt) ? expiresAt : null;
  } catch {
    return null;
  }
}

/**
 * Tracks the admin session so the form can warn before it expires (<= 15 min) and explain what
 * to do after a 401, without navigating away and losing the selected images.
 */
export function useAdminSessionWarning() {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const expiresAt = readSessionExpiry();
      if (expiresAt === null) {
        setMinutesLeft(null);
        return;
      }
      const remaining = expiresAt - Date.now();
      setExpired(remaining <= 0);
      setMinutesLeft(
        remaining > 0 && remaining <= SESSION_WARNING_MS ? Math.ceil(remaining / 60_000) : null,
      );
    };
    update();
    const interval = window.setInterval(update, 30_000);
    // A login in another tab refreshes `adminUser` and clears the warning here.
    window.addEventListener('storage', update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', update);
    };
  }, []);

  const markExpired = useCallback(() => {
    setExpired(true);
    setMinutesLeft(null);
  }, []);

  return { minutesLeft, expired, markExpired };
}
