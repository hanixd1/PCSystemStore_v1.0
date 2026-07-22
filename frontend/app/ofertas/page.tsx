import type { Metadata } from 'next';
import OffersPageClient from '@/components/OffersPageClient';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata(
  'Ofertas en componentes y hardware | PCSystemStore',
  'Consulta los productos que tienen una promoción activa en PCSystemStore.',
  '/ofertas',
);

export default function OffersPage() {
  return <OffersPageClient />;
}
