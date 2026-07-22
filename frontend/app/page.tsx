import type { Metadata } from 'next';
import { headers } from 'next/headers';
import HomePageClient from '@/components/HomePageClient';
import StructuredData from '@/components/StructuredData';
import {
  getHomeProcessors,
  getInitialProducts,
  getPublicBanners,
  getPublicBranding,
} from '@/lib/catalog-server';
import { buildHomeProcessorList } from '@/lib/products/cpuBrandInterleave';
import { organizationJsonLd, publicPageMetadata } from '@/lib/seo';

const description =
  'Encuentra componentes, laptops, periféricos y hardware para configurar o actualizar tu PC con PCSystemStore.';

export const metadata: Metadata = {
  ...publicPageMetadata(
    'Componentes, laptops y hardware para tu PC | PCSystemStore',
    description,
    '/',
  ),
};

export default async function HomePage() {
  const [products, processors, banners, branding, nonce] = await Promise.all([
    getInitialProducts(60),
    getHomeProcessors(60),
    getPublicBanners(),
    getPublicBranding(),
    headers().then((value) => value.get('x-csp-nonce')),
  ]);
  if (!nonce) throw new Error('CSP nonce is missing from the request headers');
  const organization = organizationJsonLd(
    branding?.storeName?.trim() || 'PCSystemStore',
    branding?.logoUrl?.trim() || '/icon.png',
  );

  return (
    <>
      <StructuredData nonce={nonce} value={organization} />
      <h1 className="sr-only">Componentes, laptops y hardware para armar tu PC</h1>
      <HomePageClient
        initialProducts={products}
        initialProcessors={buildHomeProcessorList(processors, 15)}
        initialBanners={banners}
      />
    </>
  );
}
