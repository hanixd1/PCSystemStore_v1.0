export type PriceLike = {
  price?: number | string | null;
  isOnSale?: boolean | string | null;
  salePrice?: number | string | null;
};

export function isSaleActive(product: PriceLike) {
  const price = Number(product.price);
  const salePrice = Number(product.salePrice);
  const enabled = product.isOnSale === true || product.isOnSale === 'true';
  return enabled && salePrice > 0 && salePrice < price;
}

export function getEffectivePrice(product: PriceLike) {
  return isSaleActive(product) ? Number(product.salePrice) : Number(product.price || 0);
}

export function getDiscountPercent(product: PriceLike) {
  if (!isSaleActive(product)) return 0;
  const price = Number(product.price);
  const salePrice = Number(product.salePrice);
  return Math.round(((price - salePrice) / price) * 100);
}
