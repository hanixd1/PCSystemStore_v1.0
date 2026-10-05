import { randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const CANONICAL_SITE_URL = 'https://www.pcsystemstore.com';
const REDIRECT_HOSTS = new Set([
  'pcsystemstore.com',
  'pcsystemstore.com.pe',
  'www.pcsystemstore.com.pe',
  // Former public URL, still shared in old links. Preview deployments use other hosts.
  'pc-system-store-frontend.vercel.app',
]);
const NO_STORE_PATHS = [
  /^\/$/,
  /^\/categoria(?:\/|$)/,
  /^\/product(?:\/|$)/,
  /^\/producto(?:\/|$)/,
  /^\/(?:tienda|ofertas|builder|armar-pc)(?:\/|$)/,
  /^\/(?:checkout|mi-cuenta|admin|auth)(?:\/|$)/,
  /^\/api(?:\/|$)/,
  /^\/sitemap\.xml$/,
];
const NO_STORE_VALUE = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';

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

export function canonicalRedirectUrl(
  requestUrl: URL,
  production: boolean,
  forwardedProtocol?: string | null,
  forwardedHost?: string | null,
): URL | null {
  if (!production) return null;

  let hostname = requestUrl.hostname;
  const requestHost = forwardedHost?.split(',')[0]?.trim();
  if (requestHost) {
    try {
      hostname = new URL(`http://${requestHost}`).hostname;
    } catch {
      hostname = requestUrl.hostname;
    }
  }
  hostname = hostname.toLowerCase().replace(/\.$/, '');
  const protocol =
    forwardedProtocol?.split(',')[0]?.trim().toLowerCase() || requestUrl.protocol.replace(':', '');
  const needsHostRedirect = REDIRECT_HOSTS.has(hostname);
  const needsHttpsRedirect = hostname === 'www.pcsystemstore.com' && protocol === 'http';
  if (!needsHostRedirect && !needsHttpsRedirect) return null;

  return new URL(`${requestUrl.pathname}${requestUrl.search}`, CANONICAL_SITE_URL);
}

export function requiresNoStore(pathname: string): boolean {
  return NO_STORE_PATHS.some((pattern) => pattern.test(pathname));
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
  const production = process.env.NODE_ENV === 'production';
  const canonicalUrl = canonicalRedirectUrl(
    request.nextUrl,
    production,
    request.headers.get('x-forwarded-proto'),
    request.headers.get('x-forwarded-host') || request.headers.get('host'),
  );
  if (canonicalUrl) {
    const status = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308;
    return NextResponse.redirect(canonicalUrl, status);
  }

  const nonce = randomBytes(16).toString('base64');
  const contentSecurityPolicy = createContentSecurityPolicy(nonce, production);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-csp-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  if (requiresNoStore(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', NO_STORE_VALUE);
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  }
  return response;
}

export const config = {
  matcher: [
    /* App HTML and route handlers; static immutable assets are deliberately excluded. */
    '/((?!_next/static|_next/image|favicon.ico|apple-icon.png|apple-touch-icon.png|icon.png).*)',
  ],
};
