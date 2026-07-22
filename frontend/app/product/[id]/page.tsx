import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProductById } from '@/lib/catalog-server';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function LegacyProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  const product = await getProductById(id);
  if (!product?.slug?.trim()) notFound();
  permanentRedirect(`/producto/${encodeURIComponent(product.slug.trim())}`);
}
