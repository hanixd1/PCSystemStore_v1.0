import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import CategoryPageClient from '@/components/CategoryPageClient';
import StructuredData from '@/components/StructuredData';
import { breadcrumbJsonLd, categoryMetadata, CATEGORY_SEO, privateMetadata } from '@/lib/seo';

type CategoryProps = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeSlug(parts: string[]) {
  return parts.map((part) => decodeURIComponent(part).trim().toLowerCase()).filter(Boolean).join('/');
}

export async function generateMetadata({ params, searchParams }: CategoryProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (typeof query.search === 'string' && query.search.trim()) return privateMetadata();
  return categoryMetadata(normalizeSlug(slug)) || privateMetadata();
}

export default async function CategoryPage({ params, searchParams }: CategoryProps) {
  const [{ slug }, query, nonce] = await Promise.all([
    params,
    searchParams,
    headers().then((value) => value.get('x-csp-nonce')),
  ]);
  if (!nonce) throw new Error('CSP nonce is missing from the request headers');
  const normalized = normalizeSlug(slug);
  const searchMode = typeof query.search === 'string' && Boolean(query.search.trim());
  const category = CATEGORY_SEO[normalized];
  if (!category && !searchMode) notFound();
  const breadcrumb = category
    ? breadcrumbJsonLd([
        { name: 'Inicio', path: '/' },
        { name: 'Tienda', path: '/tienda' },
        { name: category.name, path: `/categoria/${normalized}` },
      ])
    : null;

  return (
    <>
      {breadcrumb ? (
        <StructuredData nonce={nonce} value={breadcrumb} />
      ) : null}
      <CategoryPageClient />
    </>
  );
}
