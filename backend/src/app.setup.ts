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
