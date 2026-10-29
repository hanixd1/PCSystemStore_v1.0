import type { Metadata } from 'next';
import OffersPageClient from '@/components/OffersPageClient';
import { getAllPublicProducts } from '@/lib/catalog-server';
import { toProductCard } from '@/lib/public-product';
import { isSaleActive } from '@/lib/pricing';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata(
  'Ofertas en componentes y hardware | PCSystemStore',
  'Consulta los productos que tienen una promoción activa en PCSystemStore.',
  '/ofertas',
);

export default async function OffersPage() {
  // The API filters the flag; isSaleActive still drops offers without a valid sale price.
  // Only card fields reach the client: spec relations would bloat the RSC payload.
  const products = (await getAllPublicProducts({ isOnSale: 'true' }))
    .filter(isSaleActive)
    .map(toProductCard);
  return <OffersPageClient initialProducts={products} />;
}
