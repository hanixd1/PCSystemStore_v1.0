import { Prisma } from '@prisma/client';
import { PRODUCT_CATEGORIES } from './dto/create-product.dto';

const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_PRODUCT_CATEGORIES = new Set<string>(PRODUCT_CATEGORIES);

export const PUBLIC_PRODUCT_DATABASE_CRITERIA: Prisma.ProductWhereInput = {
  name: { not: '' },
  slug: { not: '' },
  category: { not: '' },
  price: { gt: 0 },
  stock: { gte: 0 },
};

export function withPublicProductCriteria(
  where: Prisma.ProductWhereInput = {},
): Prisma.ProductWhereInput {
  const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  return {
    ...where,
    AND: [...existingAnd, PUBLIC_PRODUCT_DATABASE_CRITERIA],
  };
}

export function isPublicProductRecord(product: unknown): boolean {
  if (!product || typeof product !== 'object' || Array.isArray(product)) return false;

  const candidate = product as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const slug = typeof candidate.slug === 'string' ? candidate.slug.trim() : '';
  const category = typeof candidate.category === 'string' ? candidate.category.trim() : '';
  const price = Number(candidate.price);
  const stock = Number(candidate.stock);

  return (
    id.length > 0 &&
    name.length > 0 &&
    PRODUCT_SLUG_PATTERN.test(slug) &&
    PUBLIC_PRODUCT_CATEGORIES.has(category) &&
    Number.isFinite(price) &&
    price > 0 &&
    Number.isInteger(stock) &&
    stock >= 0
  );
}
