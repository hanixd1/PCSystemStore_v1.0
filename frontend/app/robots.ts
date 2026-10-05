import type { MetadataRoute } from 'next';
import { absoluteUrl, getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/',
        '/auth',
        '/auth/',
        '/checkout',
        '/checkout/',
        '/mi-cuenta',
        '/mi-cuenta/',
        '/api/',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: getSiteUrl(),
  };
}
