'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ProductPage] No se pudo cargar el producto.', {
      digest: error.digest || 'not-available',
    });
  }, [error.digest]);

  return (
    <main className="min-h-[60vh] bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-gray-900">No pudimos cargar este producto</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          El catálogo puede estar temporalmente no disponible. Intenta nuevamente en unos momentos.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-brand-cyan px-5 py-3 text-sm font-black text-gray-950 transition hover:bg-cyan-400"
          >
            Volver a intentar
          </button>
          <Link
            href="/tienda"
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-800 transition hover:border-brand-cyan hover:text-brand-cyan"
          >
            Ir a la tienda
          </Link>
        </div>
      </div>
    </main>
  );
}
