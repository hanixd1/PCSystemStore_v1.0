type ProductImageCandidate = {
  image?: unknown;
  imageUrl?: unknown;
  coverImage?: unknown;
  images?: unknown;
  productImages?: unknown;
};

export const PRODUCT_IMAGE_FALLBACK = '/product-placeholder.svg';

type ResolveImageOptions = {
  fallback?: string | null;
  apiBaseUrl?: string | undefined;
};

function fallbackFor(options: ResolveImageOptions): string | null {
  return options.fallback === undefined ? PRODUCT_IMAGE_FALLBACK : options.fallback;
}

function asImageString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isLocalImagePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//');
}

function normalizeRemoteUrl(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  // Cloudinary supports HTTPS; normalize only this known host to prevent mixed content.
  if (parsed.protocol === 'http:' && parsed.hostname === 'res.cloudinary.com') {
    parsed.protocol = 'https:';
  }

  return parsed.toString();
}

/**
 * Resolves API image shapes into a safe browser source. It intentionally does
 * not manufacture a URL for unknown values or dangerous protocols.
 */
export function resolveImageUrl(value: unknown, options: ResolveImageOptions = {}): string | null {
  const candidate = asImageString(value);
  if (!candidate) return fallbackFor(options);

  if (candidate.startsWith('blob:')) return candidate;
  if (/^data:image\/(?:avif|gif|jpe?g|png|webp);base64,/i.test(candidate)) return candidate;
  if (isLocalImagePath(candidate)) return candidate;

  const remote = normalizeRemoteUrl(candidate);
  if (remote) return remote;

  // Legacy backend values may omit the leading slash. Product assets bundled
  // with this frontend live under public/uploads; other relative API paths use
  // the explicitly configured backend origin when one exists.
  if (candidate.startsWith('uploads/')) return `/${candidate}`;

  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_URL;
  try {
    return apiBaseUrl?.trim()
      ? new URL(candidate, `${new URL(apiBaseUrl).origin}/`).toString()
      : fallbackFor(options);
  } catch {
    return fallbackFor(options);
  }
}

function getImageFromItem(item: unknown): string | null {
  const directImage = resolveImageUrl(item, { fallback: null });
  if (directImage) return directImage;

  if (item && typeof item === 'object') {
    const candidate = item as {
      secureUrl?: unknown;
      secure_url?: unknown;
      url?: unknown;
      imageUrl?: unknown;
      thumbnail?: unknown;
    };
    for (const source of [
      candidate.secureUrl,
      candidate.secure_url,
      candidate.url,
      candidate.imageUrl,
      candidate.thumbnail,
    ]) {
      const image = resolveImageUrl(source, { fallback: null });
      if (image) return image;
    }
  }

  return null;
}

function getImageFromCollection(collection: unknown): string | null {
  if (!Array.isArray(collection)) return null;

  for (const item of collection) {
    const image = getImageFromItem(item);
    if (image) return image;
  }

  return null;
}

export function getProductPrimaryImage(product: unknown): string {
  if (!product || typeof product !== 'object') return PRODUCT_IMAGE_FALLBACK;

  const candidate = product as ProductImageCandidate;

  for (const source of [candidate.image, candidate.imageUrl, candidate.coverImage]) {
    const image = resolveImageUrl(source, { fallback: null });
    if (image) return image;
  }

  return (
    getImageFromCollection(candidate.images) ||
    getImageFromCollection(candidate.productImages) ||
    PRODUCT_IMAGE_FALLBACK
  );
}

export function getProductImages(product: unknown): string[] {
  const sources =
    product && typeof product === 'object'
      ? ((product as ProductImageCandidate).images ??
        (product as ProductImageCandidate).productImages)
      : undefined;
  const images = Array.isArray(sources)
    ? sources
        .map((source) => getImageFromItem(source))
        .filter((source): source is string => Boolean(source))
    : [];

  return images.length ? images : [getProductPrimaryImage(product)];
}
