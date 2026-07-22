const LOCAL_SITE_URL = 'http://localhost:3000';
const PRODUCTION_SITE_URL = 'https://www.pcsystemstore.com';

export function normalizeAbsoluteUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, '');
  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute http or https URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('NEXT_PUBLIC_SITE_URL must use http or https');
  }

  if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('NEXT_PUBLIC_SITE_URL cannot use localhost in production');
  }

  return url.toString().replace(/\/$/, '');
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = process.env.NODE_ENV === 'production' ? PRODUCTION_SITE_URL : LOCAL_SITE_URL;
  return normalizeAbsoluteUrl(configured || fallback);
}

export function absoluteUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, `${getSiteUrl()}/`).toString();
}
