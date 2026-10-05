import type { INestApplication } from '@nestjs/common';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SecurityExceptionFilter } from './security/security-exception.filter';
import {
  getBodyLimit,
  getCorsOrigins,
  validateSecurityEnvironment,
} from './security/security.config';

const NO_STORE_PATHS = [
  '/products',
  '/builder',
  '/ai',
  '/public/branding',
  '/public/banners',
  '/version',
] as const;

export function shouldDisableStorefrontCaching(method: string, path: string): boolean {
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
    return false;
  }

  return NO_STORE_PATHS.some(
    (route) => path === route || (route !== '/version' && path.startsWith(`${route}/`)),
  );
}

function applyNoStoreHeaders(response: Response): void {
  response.setHeader(
    'Cache-Control',
    'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate',
  );
  response.setHeader('CDN-Cache-Control', 'no-store');
  response.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
  response.setHeader('Surrogate-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
}

function getTrustProxy(): string | number | boolean {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }
  if (raw === 'true') {
    return 1;
  }
  if (raw === 'false') {
    return false;
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  if (['loopback', 'linklocal', 'uniquelocal'].includes(raw)) {
    return raw;
  }
  throw new Error('TRUST_PROXY debe ser false, true, un numero o una subred predefinida segura.');
}

export function configureHttpApplication(app: INestApplication): void {
  validateSecurityEnvironment();
  const expressApp = app as NestExpressApplication;
  const production = process.env.NODE_ENV === 'production';
  const allowedOrigins = getCorsOrigins();

  expressApp.set('trust proxy', getTrustProxy());
  expressApp.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      frameguard: { action: 'deny' },
      hsts: false,
      noSniff: true,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (production && request.secure) {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (shouldDisableStorefrontCaching(request.method, request.path)) {
      applyNoStoreHeaders(response);
    }
    next();
  });
  app.use(json({ limit: getBodyLimit(), strict: true }));
  app.use(urlencoded({ limit: getBodyLimit(), extended: true, parameterLimit: 1_000 }));
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origen no permitido por CORS.'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Disposition', 'Retry-After'],
  });
  app.useGlobalFilters(new SecurityExceptionFilter());
}
