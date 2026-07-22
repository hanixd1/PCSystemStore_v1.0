import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), '.env.test'));
loadEnvFile(resolve(process.cwd(), '.env.test.local'));

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET_TEST || process.env.JWT_SECRET || 'test-secret-pcsystemstore';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

if (process.env.DATABASE_URL_TEST?.trim()) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
} else {
  // El skip lo aplica e2e-test-utils. Este warning deja la causa visible en test:e2e.
  console.warn('DATABASE_URL_TEST no esta configurado. Las suites HTTP reales se omitiran.');
}
