const SSL_MODES_WITH_LEGACY_NODE_PG_SEMANTICS = new Set([
  'prefer',
  'require',
  'verify-ca',
]);

export type DatabaseUrlDiagnostics = {
  configured: boolean;
  valid: boolean;
  host: string;
  protocol: string;
  sslMode: string;
  usesPooler: boolean;
};

function assertPostgresProtocol(url: URL, variableName: string) {
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error(`${variableName} must use the postgresql protocol.`);
  }
}

export function normalizePostgresConnectionString(
  value: string,
  variableName = 'DATABASE_URL',
): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  assertPostgresProtocol(url, variableName);
  const sslMode = url.searchParams.get('sslmode')?.toLowerCase();
  if (sslMode && SSL_MODES_WITH_LEGACY_NODE_PG_SEMANTICS.has(sslMode)) {
    // pg 8 currently treats these modes as verify-full. Make that secure
    // behavior explicit before pg 9 adopts the weaker libpq distinctions.
    url.searchParams.set('sslmode', 'verify-full');
  }

  return url.toString();
}

export function inspectPostgresConnectionString(value?: string): DatabaseUrlDiagnostics {
  if (!value?.trim()) {
    return {
      configured: false,
      valid: false,
      host: 'missing',
      protocol: 'missing',
      sslMode: 'missing',
      usesPooler: false,
    };
  }

  try {
    const url = new URL(value);
    const hostParts = url.hostname.split('.');
    const safeHost =
      hostParts.length > 3 ? `***.${hostParts.slice(-3).join('.')}` : url.hostname;

    return {
      configured: true,
      valid: url.protocol === 'postgresql:' || url.protocol === 'postgres:',
      host: safeHost || 'unknown',
      protocol: url.protocol.replace(':', '') || 'unknown',
      sslMode: url.searchParams.get('sslmode') || 'missing',
      usesPooler: url.hostname.includes('-pooler'),
    };
  } catch {
    return {
      configured: true,
      valid: false,
      host: 'invalid-url',
      protocol: 'invalid-url',
      sslMode: 'unknown',
      usesPooler: false,
    };
  }
}
