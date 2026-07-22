import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/ProductDetailClient';
import StructuredData from '@/components/StructuredData';
import { getProductBySlug, getRelatedProducts, type PublicProduct } from '@/lib/catalog-server';
import {
  buildProductJsonLd,
  getProductCanonicalPath,
  getProductDescription,
  getProductSeoImages,
} from '@/lib/product-seo';
import { absoluteUrl } from '@/lib/site-url';
import { breadcrumbJsonLd } from '@/lib/seo';

type ProductPageProps = { params: Promise<{ slug: string }> };

function categoryBreadcrumb(product: PublicProduct) {
  const categories: Record<string, { name: string; path: string }> = {
    CPU: { name: 'Procesadores', path: '/categoria/cpu' },
    MOTHERBOARD: { name: 'Placas base', path: '/categoria/mobo' },
    RAM: { name: 'Memorias RAM', path: '/categoria/ram' },
    GPU: { name: 'Tarjetas gráficas', path: '/categoria/graficas' },
    STORAGE: { name: 'Almacenamiento', path: '/categoria/almacenamiento' },
    LAPTOP: { name: 'Laptops', path: '/categoria/laptops' },
    MONITOR: { name: 'Monitores', path: '/categoria/monitores' },
  };
  return categories[product.category] || { name: product.category, path: '/tienda' };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  let product: PublicProduct | null;
  try {
    product = await getProductBySlug(slug);
  } catch {
    console.error('[ProductMetadata] Public product API unavailable or malformed.');
    return {
      title: 'Producto temporalmente no disponible',
      robots: { index: false, follow: false },
    };
  }
  if (!product) notFound();
  const name = product.name;
  const description = getProductDescription(product);
  const path = getProductCanonicalPath(product);
  const url = absoluteUrl(path);
  const images = getProductSeoImages(product);

  return {
    title: { absolute: `${name} | PCSystemStore` },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { title: name, description, url, type: 'website', images },
    twitter: { card: 'summary_large_image', title: name, description, images },
  };
}

export default async function ProductSlugPage({ params }: ProductPageProps) {
  const { slug } = await params;
  if (!slug.trim()) notFound();
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [relatedProducts, nonce] = await Promise.all([
    getRelatedProducts(product.id),
    headers().then((value) => value.get('x-csp-nonce')),
  ]);
  if (!nonce) throw new Error('CSP nonce is missing from the request headers');
  const path = getProductCanonicalPath(product);
  const category = categoryBreadcrumb(product);
  const productJsonLd = buildProductJsonLd(product);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Inicio', path: '/' },
    { name: category.name, path: category.path },
    { name: product.name, path },
  ]);

  return (
    <>
      <StructuredData nonce={nonce} value={productJsonLd} />
      <StructuredData nonce={nonce} value={breadcrumbs} />
      <ProductDetailClient initialProduct={product} initialRelatedProducts={relatedProducts} />
    </>
  );
}
