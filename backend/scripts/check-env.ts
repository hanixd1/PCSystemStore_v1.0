import 'dotenv/config';
import {
  inspectPostgresConnectionString,
  normalizePostgresConnectionString,
} from '../src/prisma/database-url';

function getHost(value?: string): string {
  return inspectPostgresConnectionString(value).host;
}

function hasPooler(value?: string): boolean {
  return Boolean(value?.includes('-pooler'));
}

function hasSslMode(value?: string): boolean {
  if (!value) return false;
  try {
    return (
      inspectPostgresConnectionString(normalizePostgresConnectionString(value)).sslMode ===
      'verify-full'
    );
  } catch {
    return false;
  }
}

console.log({
  databaseUrlExists: Boolean(process.env.DATABASE_URL),
  databaseHost: getHost(process.env.DATABASE_URL),
  databaseUsesPooler: hasPooler(process.env.DATABASE_URL),
  databaseUsesSsl: hasSslMode(process.env.DATABASE_URL),

  directUrlExists: Boolean(process.env.DIRECT_URL),
  directHost: getHost(process.env.DIRECT_URL),
  directUsesPooler: hasPooler(process.env.DIRECT_URL),
  directUsesSsl: hasSslMode(process.env.DIRECT_URL),
});
