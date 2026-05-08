import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { resetQaDatabase, seedQaDatabase } from '../test/fixtures/seed-qa';

function loadEnvTest() {
  for (const fileName of ['.env.test', '.env.test.local']) {
    const filePath = resolve(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

async function main() {
  loadEnvTest();

  if (!process.env.DATABASE_URL_TEST?.trim()) {
    throw new Error('Configura DATABASE_URL_TEST antes de ejecutar seed QA.');
  }

  if (process.env.NODE_ENV !== 'test' && process.env.QA_SEED_ALLOW !== 'true') {
    throw new Error(
      'Seed QA bloqueado: NODE_ENV debe ser test. Usa QA_SEED_ALLOW=true solo si confirmaste que la DB es QA/test.',
    );
  }

  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  const prisma = new PrismaClient();

  try {
    await resetQaDatabase(prisma);
    await seedQaDatabase(prisma);
    console.log('Seed QA ejecutado correctamente.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
