import type { Metadata } from 'next';
import OffersPageClient from '@/components/OffersPageClient';
import { getAllPublicProducts } from '@/lib/catalog-server';
import { isSaleActive } from '@/lib/pricing';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata(
  'Ofertas en componentes y hardware | PCSystemStore',
  'Consulta los productos que tienen una promoción activa en PCSystemStore.',
  '/ofertas',
);

export default async function OffersPage() {
  const products = (await getAllPublicProducts()).filter(isSaleActive);
  return <OffersPageClient initialProducts={products} />;
}
