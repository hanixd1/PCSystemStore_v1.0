import 'dotenv/config';

function getHost(value?: string): string {
  if (!value) return 'NO DEFINIDA';

  try {
    return new URL(value).host;
  } catch {
    return 'URL INVÁLIDA';
  }
}

function hasPooler(value?: string): boolean {
  return Boolean(value?.includes('-pooler'));
}

function hasSslMode(value?: string): boolean {
  return Boolean(value?.includes('sslmode=require'));
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