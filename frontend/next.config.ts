import type { NextConfig } from 'next';
import { REMOTE_IMAGE_HOSTS } from './proxy';

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
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
    ];
    if (isProduction) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }
    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
