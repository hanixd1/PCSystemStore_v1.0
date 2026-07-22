import type { PublicProduct } from '@/lib/public-product';
import { getProductImages, PRODUCT_IMAGE_FALLBACK } from '@/lib/product-images';
import { getEffectivePrice } from '@/lib/pricing';
import { absoluteUrl } from '@/lib/site-url';

function plainText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text || undefined;
}

export function getProductDescription(product: PublicProduct): string {
  return plainText(product.description) || `${product.name} disponible en PCSystemStore.`;
}

export function getProductBrand(product: PublicProduct): string | undefined {
  for (const [key, value] of Object.entries(product)) {
    if (!key.endsWith('Specs') || !value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    const brand = plainText((value as { brand?: unknown }).brand);
    if (brand) return brand;
  }
  return undefined;
}

export function getProductCanonicalPath(product: PublicProduct): string {
  return `/producto/${encodeURIComponent(product.slug)}`;
}

export function getProductSeoImages(product: PublicProduct): string[] {
  return getProductImages(product)
    .filter((image) => image.startsWith('/') || image.startsWith('https://'))
    .map((image) => (image.startsWith('https://') ? image : absoluteUrl(image)));
}

export function buildProductJsonLd(product: PublicProduct) {
  const path = getProductCanonicalPath(product);
  const url = absoluteUrl(path);
  const brand = getProductBrand(product);
  const images = getProductSeoImages(product).filter(
    (image) => !image.endsWith(PRODUCT_IMAGE_FALLBACK),
  );
  const price = getEffectivePrice(product);
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PEN',
      price: price.toFixed(2),
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'PCSystemStore' },
    },
  };

  const description = plainText(product.description);
  if (description) jsonLd.description = description;
  if (images.length > 0) jsonLd.image = images;
  if (product.sku) jsonLd.sku = product.sku;
  if (brand) jsonLd.brand = { '@type': 'Brand', name: brand };
  if (product.category) jsonLd.category = product.category;

  return jsonLd;
}
