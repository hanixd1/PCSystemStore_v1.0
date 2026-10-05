'use client';

import { useEffect } from 'react';
import { APP_VERSION, COMMIT_SHA } from '@/lib/build-info';

const LEGACY_CACHE_CLEANUP_MARKER = 'pcsystemstore:legacy-cache-cleanup:v1';

async function removeLegacyBrowserCaches(): Promise<boolean> {
  const tasks: Promise<unknown>[] = [];
  let foundLegacyState = false;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    foundLegacyState = Boolean(navigator.serviceWorker.controller || registrations.length);
    tasks.push(...registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await window.caches.keys();
    foundLegacyState ||= cacheNames.length > 0;
    tasks.push(...cacheNames.map((cacheName) => window.caches.delete(cacheName)));
  }

  const results = await Promise.allSettled(tasks);
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Al menos una caché o registro de service worker no pudo eliminarse.');
  }
  return foundLegacyState;
}

export default function RuntimeMaintenance() {
  useEffect(() => {
    let cancelled = false;

    const retireLegacyCache = async () => {
      try {
        try {
          if (window.localStorage.getItem(LEGACY_CACHE_CLEANUP_MARKER)) return;
        } catch {
          // Storage puede estar deshabilitado; la limpieza aún debe ejecutarse.
        }

        const shouldReload = await removeLegacyBrowserCaches();
        try {
          window.localStorage.setItem(LEGACY_CACHE_CLEANUP_MARKER, new Date().toISOString());
        } catch {
          // Sin storage persistente, la siguiente carga confirmará que ya no quedan caches/workers.
        }
        if (shouldReload && !cancelled) {
          window.location.reload();
        }
      } catch (error) {
        console.warn('[RuntimeMaintenance] No se pudo limpiar el caché web legado.', error);
      }
    };

    void retireLegacyCache();

    if (process.env.NODE_ENV === 'development') {
      console.info(`[PCSystemStore] frontend ${APP_VERSION} (${COMMIT_SHA})`);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
