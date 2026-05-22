import 'dotenv/config';

type UrlDiagnostics = {
  exists: boolean;
  host: string;
  hasPooler: boolean;
  usesSslModeRequire: boolean;
  valid: boolean;
};

function inspectDatabaseUrl(value: string | undefined): UrlDiagnostics {
  if (!value?.trim()) {
    return {
      exists: false,
      host: 'missing',
      hasPooler: false,
      usesSslModeRequire: false,
      valid: false,
    };
  }

  try {
    const parsed = new URL(value);

    return {
      exists: true,
      host: parsed.host,
      hasPooler: parsed.hostname.includes('-pooler'),
      usesSslModeRequire: parsed.searchParams.get('sslmode') === 'require',
      valid: true,
    };
  } catch {
    return {
      exists: true,
      host: 'invalid-url',
      hasPooler: value.includes('-pooler'),
      usesSslModeRequire: value.includes('sslmode=require'),
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
  console.log(`  sslmode=require: ${diagnostics.usesSslModeRequire ? 'yes' : 'no'}`);
}

const databaseUrlDiagnostics = inspectDatabaseUrl(process.env.DATABASE_URL);
const directUrlDiagnostics = inspectDatabaseUrl(process.env.DIRECT_URL);

printDiagnostics('DATABASE_URL', databaseUrlDiagnostics);
printDiagnostics('DIRECT_URL', directUrlDiagnostics);

const prismaCliSource = directUrlDiagnostics.exists ? 'DIRECT_URL' : 'DATABASE_URL fallback';
console.log(`Prisma CLI datasource source: ${prismaCliSource}`);
