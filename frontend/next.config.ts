import type { NextConfig } from 'next';
import { REMOTE_IMAGE_HOSTS } from './proxy';

const isProduction = process.env.NODE_ENV === 'production';
const publicBuildValue = (value: string | undefined, fallback: string) =>
  value
    ?.trim()
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 64) || fallback;
const appVersion = publicBuildValue(process.env.NEXT_PUBLIC_APP_VERSION, '0.1.0');
const commitSha = publicBuildValue(
  process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA,
  'local',
);
const noStoreHeaders = [
  {
    key: 'Cache-Control',
    value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  },
  { key: 'CDN-Cache-Control', value: 'no-store' },
  { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
  { key: 'Cloudflare-CDN-Cache-Control', value: 'no-store' },
];
const dynamicStorefrontPaths = [
  '/',
  '/categoria/:path*',
  '/product/:path*',
  '/producto/:path*',
  '/tienda',
  '/ofertas',
  '/builder',
  '/armar-pc',
  '/checkout/:path*',
  '/mi-cuenta/:path*',
  '/admin/:path*',
  '/auth/:path*',
  '/api/:path*',
  '/sitemap.xml',
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
  },
  images: {
    remotePatterns: REMOTE_IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
  async headers() {
    const headers = [
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
      { key: 'X-PCSystemStore-App-Version', value: appVersion },
      { key: 'X-PCSystemStore-Commit', value: commitSha.slice(0, 40) },
    ];
    if (isProduction) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }
    return [
      { source: '/:path*', headers },
      ...dynamicStorefrontPaths.map((source) => ({ source, headers: noStoreHeaders })),
      {
        source: '/sw.js',
        headers: [...noStoreHeaders, { key: 'Service-Worker-Allowed', value: '/' }],
      },
      {
        source: '/service-worker.js',
        headers: [...noStoreHeaders, { key: 'Service-Worker-Allowed', value: '/' }],
      },
    ];
  },
};

export default nextConfig;
