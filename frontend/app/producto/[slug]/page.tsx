import type { Metadata } from 'next';
import ProductDetailClient from '@/components/ProductDetailClient';
import { API_URL } from '@/lib/api';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

type ProductMetadata = {
  name?: string;
  description?: string | null;
  slug?: string | null;
  images?: string[];
};

async function getProductMetadata(slug: string): Promise<ProductMetadata | null> {
  if (!API_URL) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/products/slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductMetadata(slug);
  const title = product?.name ? `${product.name} | PCSystemStore` : 'Producto | PCSystemStore';
  const description =
    product?.description ||
    'Compra hardware, componentes y periféricos en PCSystemStore.';
  const canonicalPath = `/producto/${product?.slug || slug}`;
  const images = Array.isArray(product?.images) && product.images[0] ? [product.images[0]] : [];

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.pcsystemstore.com${canonicalPath}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.pcsystemstore.com${canonicalPath}`,
      images,
    },
  };
}

export default async function ProductSlugPage({ params }: ProductPageProps) {
  const { slug } = await params;

  return <ProductDetailClient identifier={slug} />;
}
