import 'dotenv/config';
import {
  inspectPostgresConnectionString,
  normalizePostgresConnectionString,
} from '../src/prisma/database-url';

type UrlDiagnostics = {
  exists: boolean;
  host: string;
  hasPooler: boolean;
  sslMode: string;
  valid: boolean;
};

function inspectDatabaseUrl(value: string | undefined): UrlDiagnostics {
  if (!value?.trim()) {
    return {
      exists: false,
      host: 'missing',
      hasPooler: false,
      sslMode: 'missing',
      valid: false,
    };
  }

  try {
    const parsed = new URL(value);
    const safe = inspectPostgresConnectionString(normalizePostgresConnectionString(value));

    return {
      exists: true,
      host: safe.host,
      hasPooler: parsed.hostname.includes('-pooler'),
      sslMode: safe.sslMode,
      valid: true,
    };
  } catch {
    return {
      exists: true,
      host: 'invalid-url',
      hasPooler: value.includes('-pooler'),
      sslMode: 'unknown',
      valid: false,
    };
  }
}

function printDiagnostics(name: string, diagnostics: UrlDiagnostics) {
  console.log(`${name}:`);
  console.log(`  exists: ${diagnostics.exists ? 'yes' : 'no'}`);
  console.log(`  valid: ${diagnostics.valid ? 'yes' : 'no'}`);
  console.log(`  host: ${diagnostics.host}`);
  console.log(`  contains -pooler: ${diagnostics.hasPooler ? 'yes' : 'no'}`);
  console.log(`  sslmode: ${diagnostics.sslMode}`);
}

const databaseUrlDiagnostics = inspectDatabaseUrl(process.env.DATABASE_URL);
const directUrlDiagnostics = inspectDatabaseUrl(process.env.DIRECT_URL);

printDiagnostics('DATABASE_URL', databaseUrlDiagnostics);
printDiagnostics('DIRECT_URL', directUrlDiagnostics);

const prismaCliSource = directUrlDiagnostics.exists ? 'DIRECT_URL' : 'DATABASE_URL fallback';
console.log(`Prisma CLI datasource source: ${prismaCliSource}`);
