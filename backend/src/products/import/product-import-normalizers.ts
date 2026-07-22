import { parseBooleanLike } from '../../common/dto/transformers';

export const AMD_SOCKETS = ['AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5'] as const;
export const INTEL_SOCKETS = ['LGA 1200', 'LGA 1700', 'LGA 1851'] as const;
export const ALL_CPU_SOCKETS = [...AMD_SOCKETS, ...INTEL_SOCKETS] as const;

const SOCKET_ALIASES: Record<string, string> = {
  AM4: 'AM4',
  AM5: 'AM5',
  STR4: 'sTR4',
  STRX4: 'sTRX4',
  SWRX8: 'sWRX8',
  STR5: 'sTR5',
  LGA1200: 'LGA 1200',
  'LGA 1200': 'LGA 1200',
  LGA1700: 'LGA 1700',
  'LGA 1700': 'LGA 1700',
  LGA1851: 'LGA 1851',
  'LGA 1851': 'LGA 1851',
};

export function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

export function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function normalizePartNumber(value: unknown) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^A-Z0-9_-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 80);
}

export function normalizeZipFileName(value: unknown) {
  return normalizeText(value)
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.trim()
    .toLowerCase();
}

export function isSafeZipEntryName(value: string) {
  const normalized = value.replace(/\\/g, '/');
  return (
    Boolean(normalized.trim()) &&
    !normalized.includes('\0') &&
    !normalized.startsWith('/') &&
    !/^[a-z]:\//i.test(normalized) &&
    !normalized.includes('../') &&
    !normalized.includes('..\\') &&
    !normalized.split('/').some((part) => part === '..')
  );
}

export function isAllowedImageFile(value: string) {
  return /\.(jpe?g|png|webp)$/i.test(value);
}

export function splitFileList(value: unknown) {
  return normalizeText(value)
    .split(';')
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function parseImportBoolean(value: unknown) {
  return parseBooleanLike(value);
}

export function parseRequiredNumber(value: unknown) {
  const normalized = String(value ?? '')
    .replace(',', '.')
    .trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  const parsed = Number(match?.[0] ?? normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseRequiredInteger(value: unknown) {
  const parsed = parseRequiredNumber(value);
  if (parsed === undefined || !Number.isInteger(parsed)) {
    return undefined;
  }
  return parsed;
}

export function normalizeSocket(value: unknown) {
  const raw = normalizeText(value)
    .replace(/^socket\s+/i, '')
    .replace(/\s+/g, ' ');
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  const spaced = raw.toUpperCase();
  return SOCKET_ALIASES[compact] ?? SOCKET_ALIASES[spaced] ?? raw;
}

export function normalizeSocketList(value: unknown) {
  return normalizeText(value)
    .split(';')
    .map((item) => normalizeSocket(item))
    .filter(Boolean);
}

export function isAmdSocket(socket: string) {
  return AMD_SOCKETS.includes(socket as (typeof AMD_SOCKETS)[number]);
}

export function isKnownSocket(socket: string) {
  return ALL_CPU_SOCKETS.includes(socket as (typeof ALL_CPU_SOCKETS)[number]);
}

export function normalizeFormFactor(value: unknown) {
  const normalized = normalizeText(value).toUpperCase().replace(/\s+/g, ' ');
  if (['MICRO ATX', 'MICRO-ATX', 'MATX', 'M-ATX'].includes(normalized)) {
    return 'Micro-ATX';
  }
  if (['MINI ITX', 'MINI-ITX', 'ITX'].includes(normalized)) {
    return 'Mini-ITX';
  }
  if (normalized === 'E-ATX' || normalized === 'EATX') {
    return 'E-ATX';
  }
  if (normalized === 'ATX') {
    return 'ATX';
  }
  return normalizeText(value);
}

export function normalizeMemoryType(value: unknown) {
  const normalized = normalizeText(value).toUpperCase().replace(/\s+/g, '');
  if (['DDR3', 'DDR4', 'DDR5'].includes(normalized)) {
    return normalized;
  }
  return normalizeText(value);
}

export function getMimeTypeFromFileName(fileName: string) {
  if (/\.png$/i.test(fileName)) {
    return 'image/png';
  }
  if (/\.webp$/i.test(fileName)) {
    return 'image/webp';
  }
  return 'image/jpeg';
}
