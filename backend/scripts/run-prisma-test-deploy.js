const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const { spawnSync } = require('child_process');

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

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

loadEnvFile('.env.test');
loadEnvFile('.env.test.local');

if (!process.env.DATABASE_URL_TEST || !process.env.DATABASE_URL_TEST.trim()) {
  console.error('DATABASE_URL_TEST no esta configurado. No se ejecutan migraciones QA/test.');
  process.exit(1);
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.DIRECT_URL = process.env.DATABASE_URL_TEST;

const command = resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);
const result = spawnSync(command, ['migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
