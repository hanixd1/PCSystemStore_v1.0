import { randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Image hosts that are present in product and banner data controlled by this
 * application. Keep this list explicit: it is shared by the CSP and the
 * Next/Image configuration, and must not become a protocol or host wildcard.
 */
export const REMOTE_IMAGE_HOSTS = [
  'res.cloudinary.com',
  'images.unsplash.com',
  'www.amd.com',
  'dlcdnwebimgs.asus.com',
  'media.kingston.com',
  'assets.corsair.com',
  'static.bhphoto.com',
  'static.gigabyte.com',
  'storage-asset.msi.com',
] as const;

function configuredOrigin(value: string | undefined): string | undefined {
  try {
    return value?.trim() ? new URL(value).origin : undefined;
  } catch {
    return undefined;
  }
}

export function createContentSecurityPolicy(nonce: string, production: boolean): string {
  const apiOrigin = configuredOrigin(process.env.NEXT_PUBLIC_API_URL);
  const mapsFrameSource = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
    ? 'https://www.google.com'
    : undefined;
  const connectSources = ["'self'", apiOrigin].filter(Boolean).join(' ');
  const imageSources = [
    "'self'",
    'data:',
    'blob:',
    ...REMOTE_IMAGE_HOSTS.map((host) => `https://${host}`),
  ].join(' ');
  const scriptSource = production
    ? `'self' 'nonce-${nonce}'`
    : "'self' 'unsafe-inline' 'unsafe-eval'";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSource}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src ${imageSources}`,
    `connect-src ${connectSources}`,
    ["frame-src 'self'", mapsFrameSource].filter(Boolean).join(' '),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  const production = process.env.NODE_ENV === 'production';
  const contentSecurityPolicy = createContentSecurityPolicy(nonce, production);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-csp-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    /* App HTML and route handlers; static immutable assets are deliberately excluded. */
    '/((?!_next/static|_next/image|favicon.ico|apple-icon.png|apple-touch-icon.png|icon.png).*)',
  ],
};
