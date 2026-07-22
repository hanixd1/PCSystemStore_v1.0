const PRODUCT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NON_PUBLIC_STATUSES = new Set(['INACTIVE', 'DRAFT', 'HIDDEN', 'ARCHIVED', 'DISABLED']);
const PUBLIC_PRODUCT_CATEGORIES = new Set([
  'CPU',
  'MOTHERBOARD',
  'RAM',
  'GPU',
  'PSU',
  'CASE',
  'COOLER',
  'STORAGE',
  'LAPTOP',
  'PC_DESKTOP',
  'SOFTWARE',
  'MONITOR',
  'KEYBOARD',
  'MOUSE',
  'MOUSEPAD',
  'CHAIR',
  'GAMING_DESK',
  'HEADSET',
  'MICROPHONE',
  'SPEAKER',
  'WEBCAM',
  'CAPTURE_CARD',
  'CABLE_HUB',
  'LAPTOP_COOLING_BASE',
  'BACKPACK',
]);

export type PublicProduct = Record<string, unknown> & {
  id: string;
  sku?: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  isOnSale: boolean;
  salePrice?: number;
  stock: number;
  images?: unknown;
  category: string;
  updatedAt?: string;
};

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function isValidProductSlug(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_SLUG_PATTERN.test(value.trim());
}

export function normalizePublicProduct(value: unknown): PublicProduct | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const product = value as Record<string, unknown>;
  const id = optionalText(product.id);
  const name = optionalText(product.name);
  const slug = optionalText(product.slug);
  const category = optionalText(product.category);
  const price = finiteNumber(product.price);
  const stock = finiteNumber(product.stock);
  const status = optionalText(product.status)?.toUpperCase();

  if (
    !id ||
    !PRODUCT_ID_PATTERN.test(id) ||
    !name ||
    !slug ||
    !isValidProductSlug(slug) ||
    !category ||
    !PUBLIC_PRODUCT_CATEGORIES.has(category) ||
    price === null ||
    price <= 0 ||
    stock === null ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    product.isActive === false ||
    product.published === false ||
    (status && NON_PUBLIC_STATUSES.has(status))
  ) {
    return null;
  }

  const salePrice = finiteNumber(product.salePrice);
  const hasValidSale =
    (product.isOnSale === true || product.isOnSale === 'true') &&
    salePrice !== null &&
    salePrice > 0 &&
    salePrice < price;
  const description = optionalText(product.description);
  const sku = optionalText(product.sku);
  const updatedAt = optionalText(product.updatedAt);

  return {
    ...product,
    id,
    name,
    slug,
    category,
    price,
    stock,
    isOnSale: hasValidSale,
    ...(hasValidSale ? { salePrice } : {}),
    ...(description ? { description } : {}),
    ...(sku ? { sku } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function normalizePublicProductList(value: unknown): PublicProduct[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((product) => normalizePublicProduct(product))
    .filter((product): product is PublicProduct => product !== null);
}
