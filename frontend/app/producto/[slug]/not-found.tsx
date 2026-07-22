import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <main className="min-h-[60vh] bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-gray-900">Producto no disponible</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          El producto no existe, ya no está publicado o todavía no cuenta con los datos mínimos para
          mostrarse en el catálogo.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/tienda"
            className="rounded-xl bg-brand-cyan px-5 py-3 text-sm font-black text-gray-950 transition hover:bg-cyan-400"
          >
            Ir a la tienda
          </Link>
          <Link
            href="/categoria/componentes"
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-800 transition hover:border-brand-cyan hover:text-brand-cyan"
          >
            Ver categorías
          </Link>
        </div>
      </div>
    </main>
  );
}
