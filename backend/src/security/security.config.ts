export const SECURITY_DEFAULTS = {
  bodyLimit: '1mb',
  excelMaxFileSize: 5 * 1024 * 1024,
  zipMaxFileSize: 50 * 1024 * 1024,
  importMaxRows: 2_000,
  importMaxColumns: 128,
  importMaxSheets: 8,
  importMaxZipEntries: 500,
  importMaxUncompressedSize: 200 * 1024 * 1024,
  importMaxCompressionRatio: 100,
  adminLoginMaxAttempts: 4,
  adminLoginWindowMinutes: 15,
  adminLoginLockMinutes: 15,
  customerLoginMaxAttempts: 4,
  customerLoginInitialLockMinutes: 60,
  customerLoginEscalatedLockHours: 24,
  customerLoginWindowMinutes: 60,
  customerLoginIpMaxAttempts: 20,
  argon2MemoryCost: 19_456,
  argon2TimeCost: 2,
  argon2Parallelism: 1,
} as const;

export function parseOriginList(value?: string): string[] {
  return [...new Set((value ?? '').split(',').map(normalizeOrigin).filter(Boolean))];
}

function normalizeOrigin(origin: string): string {
  try {
    const parsed = new URL(origin.trim());
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

export function getCorsOrigins(): string[] {
  return parseOriginList(
    [process.env.CORS_ORIGINS, process.env.CORS_ORIGIN, process.env.FRONTEND_URL]
      .filter(Boolean)
      .join(','),
  );
}

export function getCsrfAllowedOrigins(): string[] {
  const configured = parseOriginList(process.env.CSRF_ALLOWED_ORIGINS);
  return configured.length > 0 ? configured : getCorsOrigins();
}

export function getPositiveInteger(name: string, fallback: number, minimum = 1): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} debe ser un entero mayor o igual a ${minimum}.`);
  }
  return value;
}

export function getBodyLimit(): string {
  const value = process.env.BODY_LIMIT?.trim().toLowerCase() || SECURITY_DEFAULTS.bodyLimit;
  if (!/^\d+(?:kb|mb)$/.test(value)) {
    throw new Error('BODY_LIMIT debe usar el formato 512kb o 1mb.');
  }
  return value;
}

export function validateSecurityEnvironment(): void {
  const production = process.env.NODE_ENV === 'production';
  const origins = getCorsOrigins();
  const csrfOrigins = getCsrfAllowedOrigins();
  getBodyLimit();

  const numericSettings: Array<[string, number, number]> = [
    ['EXCEL_MAX_FILE_SIZE', SECURITY_DEFAULTS.excelMaxFileSize, 1],
    ['ZIP_MAX_FILE_SIZE', SECURITY_DEFAULTS.zipMaxFileSize, 1],
    ['IMPORT_MAX_ROWS', SECURITY_DEFAULTS.importMaxRows, 1],
    ['IMPORT_MAX_COLUMNS', SECURITY_DEFAULTS.importMaxColumns, 1],
    ['IMPORT_MAX_SHEETS', SECURITY_DEFAULTS.importMaxSheets, 1],
    ['IMPORT_MAX_ZIP_ENTRIES', SECURITY_DEFAULTS.importMaxZipEntries, 1],
    ['IMPORT_MAX_UNCOMPRESSED_SIZE', SECURITY_DEFAULTS.importMaxUncompressedSize, 1],
    ['IMPORT_MAX_COMPRESSION_RATIO', SECURITY_DEFAULTS.importMaxCompressionRatio, 1],
    ['ADMIN_LOGIN_MAX_ATTEMPTS', SECURITY_DEFAULTS.adminLoginMaxAttempts, 1],
    ['ADMIN_LOGIN_WINDOW_MINUTES', SECURITY_DEFAULTS.adminLoginWindowMinutes, 1],
    ['ADMIN_LOGIN_LOCK_MINUTES', SECURITY_DEFAULTS.adminLoginLockMinutes, 1],
    ['CUSTOMER_LOGIN_MAX_ATTEMPTS', SECURITY_DEFAULTS.customerLoginMaxAttempts, 1],
    ['CUSTOMER_LOGIN_INITIAL_LOCK_MINUTES', SECURITY_DEFAULTS.customerLoginInitialLockMinutes, 1],
    ['CUSTOMER_LOGIN_ESCALATED_LOCK_HOURS', SECURITY_DEFAULTS.customerLoginEscalatedLockHours, 1],
    ['CUSTOMER_LOGIN_WINDOW_MINUTES', SECURITY_DEFAULTS.customerLoginWindowMinutes, 1],
    ['CUSTOMER_LOGIN_IP_MAX_ATTEMPTS', SECURITY_DEFAULTS.customerLoginIpMaxAttempts, 1],
    ['ARGON2_MEMORY_COST', SECURITY_DEFAULTS.argon2MemoryCost, SECURITY_DEFAULTS.argon2MemoryCost],
    ['ARGON2_TIME_COST', SECURITY_DEFAULTS.argon2TimeCost, SECURITY_DEFAULTS.argon2TimeCost],
    [
      'ARGON2_PARALLELISM',
      SECURITY_DEFAULTS.argon2Parallelism,
      SECURITY_DEFAULTS.argon2Parallelism,
    ],
  ];
  for (const [name, fallback, minimum] of numericSettings) {
    getPositiveInteger(name, fallback, minimum);
  }

  if (production && origins.length === 0) {
    throw new Error('CORS_ORIGINS debe contener al menos un origen en produccion.');
  }
  if (production && csrfOrigins.length === 0) {
    throw new Error('CSRF_ALLOWED_ORIGINS debe contener al menos un origen en produccion.');
  }
  if (production && !process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET debe estar configurado en produccion.');
  }
  if (production && !process.env.RATE_LIMIT_KEY_SECRET?.trim()) {
    throw new Error('RATE_LIMIT_KEY_SECRET debe estar configurado en produccion.');
  }
}

export function getImportLimits() {
  return {
    excelMaxFileSize: getPositiveInteger('EXCEL_MAX_FILE_SIZE', SECURITY_DEFAULTS.excelMaxFileSize),
    zipMaxFileSize: getPositiveInteger('ZIP_MAX_FILE_SIZE', SECURITY_DEFAULTS.zipMaxFileSize),
    maxRows: getPositiveInteger('IMPORT_MAX_ROWS', SECURITY_DEFAULTS.importMaxRows),
    maxColumns: getPositiveInteger('IMPORT_MAX_COLUMNS', SECURITY_DEFAULTS.importMaxColumns),
    maxSheets: getPositiveInteger('IMPORT_MAX_SHEETS', SECURITY_DEFAULTS.importMaxSheets),
    maxZipEntries: getPositiveInteger(
      'IMPORT_MAX_ZIP_ENTRIES',
      SECURITY_DEFAULTS.importMaxZipEntries,
    ),
    maxUncompressedSize: getPositiveInteger(
      'IMPORT_MAX_UNCOMPRESSED_SIZE',
      SECURITY_DEFAULTS.importMaxUncompressedSize,
    ),
    maxCompressionRatio: getPositiveInteger(
      'IMPORT_MAX_COMPRESSION_RATIO',
      SECURITY_DEFAULTS.importMaxCompressionRatio,
    ),
  };
}
