type ProductImageCandidate = {
  image?: unknown;
  imageUrl?: unknown;
  coverImage?: unknown;
  images?: unknown;
  productImages?: unknown;
};

function isValidImageUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//.test(value.trim());
}

function getImageFromCollection(collection: unknown): string | null {
  if (!Array.isArray(collection)) return null;

  for (const item of collection) {
    if (isValidImageUrl(item)) return item.trim();

    if (item && typeof item === 'object') {
      const candidate = item as { secureUrl?: unknown; url?: unknown; imageUrl?: unknown };
      if (isValidImageUrl(candidate.secureUrl)) return candidate.secureUrl.trim();
      if (isValidImageUrl(candidate.url)) return candidate.url.trim();
      if (isValidImageUrl(candidate.imageUrl)) return candidate.imageUrl.trim();
    }
  }

  return null;
}

export function getProductPrimaryImage(product: unknown): string | null {
  if (!product || typeof product !== 'object') return null;

  const candidate = product as ProductImageCandidate;

  if (isValidImageUrl(candidate.image)) return candidate.image.trim();
  if (isValidImageUrl(candidate.imageUrl)) return candidate.imageUrl.trim();
  if (isValidImageUrl(candidate.coverImage)) return candidate.coverImage.trim();

  return getImageFromCollection(candidate.images) || getImageFromCollection(candidate.productImages);
}
