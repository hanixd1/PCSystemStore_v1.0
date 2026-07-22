import type { Metadata } from 'next';
import Link from 'next/link';
import { privateMetadata } from '@/lib/seo';

export const metadata: Metadata = privateMetadata();
export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-black text-gray-900">Página no encontrada</h1>
      <p className="mt-4 text-gray-600">La dirección solicitada no existe o ya no está disponible.</p>
      <Link href="/tienda" className="mt-8 bg-brand-cyan px-6 py-3 font-black text-gray-950">Ir a la tienda</Link>
    </main>
  );
}
