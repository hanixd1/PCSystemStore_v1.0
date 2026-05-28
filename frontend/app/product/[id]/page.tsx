import ProductDetailClient from '@/components/ProductDetailClient';

export default async function LegacyProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ProductDetailClient identifier={id} />;
}
