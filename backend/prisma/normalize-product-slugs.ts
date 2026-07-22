import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizePostgresConnectionString } from '../src/prisma/database-url';

const MAX_SLUG_LENGTH = 120;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be configured to normalize product slugs.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: normalizePostgresConnectionString(databaseUrl),
  }),
});

function slugifyProductName(name: string) {
  const normalized = String(name || '')
    .toLowerCase()
    .trim()
    .normalize('NFD');

  const chars: string[] = [];
  let previousWasSeparator = false;

  for (const char of normalized) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (code >= 0x0300 && code <= 0x036f) continue;

    const isLetter = code >= 97 && code <= 122;
    const isDigit = code >= 48 && code <= 57;

    if (isLetter || isDigit) {
      chars.push(char);
      previousWasSeparator = false;
      continue;
    }

    if (char === '.') {
      continue;
    }

    if (!previousWasSeparator && chars.length > 0) {
      chars.push('-');
      previousWasSeparator = true;
    }
  }

  const baseSlug = chars.join('').split('-').filter(Boolean).join('-');
  return (baseSlug || 'producto').slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '') || 'producto';
}

function buildUniqueSlug(baseSlug: string, usedSlugs: Set<string>) {
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const suffixText = suffix === 0 ? '' : `-${suffix + 1}`;
    const candidateBase = baseSlug.slice(0, MAX_SLUG_LENGTH - suffixText.length).replace(/-+$/g, '');
    const candidate = `${candidateBase || 'producto'}${suffixText}`;

    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate);
      return candidate;
    }
  }

  throw new Error(`Could not generate a unique slug for base slug: ${baseSlug}`);
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const usedSlugs = new Set<string>();
  const updates = products.map((product) => {
    const baseSlug = slugifyProductName(product.name);
    const nextSlug = buildUniqueSlug(baseSlug, usedSlugs);

    return {
      id: product.id,
      name: product.name,
      currentSlug: product.slug,
      nextSlug,
      changed: product.slug !== nextSlug,
    };
  });

  const changedUpdates = updates.filter((update) => update.changed);

  if (changedUpdates.length === 0) {
    console.log('[slugs] No product slugs need normalization.');
    return;
  }

  console.log(`[slugs] ${changedUpdates.length} product slug(s) will be normalized.`);
  for (const update of changedUpdates) {
    console.log(`[slugs] ${update.currentSlug} -> ${update.nextSlug}`);
  }

  if (isDryRun) {
    console.log('[slugs] Dry run finished. No database changes were applied.');
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const update of updates) {
        await tx.product.update({
          where: { id: update.id },
          data: { slug: `normalizing-${update.id}` },
        });
      }

      for (const update of updates) {
        await tx.product.update({
          where: { id: update.id },
          data: { slug: update.nextSlug },
        });
      }
    },
    { timeout: 120_000 },
  );

  console.log('[slugs] Product slugs normalized successfully.');
}

main()
  .catch((error) => {
    console.error('[slugs] Failed to normalize product slugs.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
