import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function registerProcessDiagnostics() {
  process.on('beforeExit', (code) => {
    console.warn(`[BOOT] beforeExit emitted with code ${code}`);
  });

  process.on('exit', (code) => {
    console.warn(`[BOOT] exit emitted with code ${code}`);
  });

  process.on('SIGTERM', () => {
    console.warn('[BOOT] SIGTERM received');
  });

  process.on('SIGINT', () => {
    console.warn('[BOOT] SIGINT received');
  });

  process.on('uncaughtException', (error) => {
    console.error('[BOOT] Uncaught exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[BOOT] Unhandled rejection', reason);
    process.exit(1);
  });
}

function getDatabaseHost(databaseUrl?: string) {
  if (!databaseUrl?.trim()) {
    return 'missing';
  }

  try {
    return new URL(databaseUrl).host || 'unknown';
  } catch {
    return 'invalid-url';
  }
}

function parseOrigins(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  registerProcessDiagnostics();
  console.log('[BOOT] Starting PCSystemStore backend...');
  console.log(`[BOOT] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`[BOOT] PORT=${process.env.PORT || '3000'}`);

  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;
  const logger = new Logger('Bootstrap');
  const frontendUrl = parseOrigins(process.env.FRONTEND_URL);
  const configuredOrigins = [
    ...new Set([
      ...parseOrigins(process.env.CORS_ORIGINS),
      ...parseOrigins(process.env.CORS_ORIGIN),
      ...frontendUrl,
    ]),
  ];
  const allowedOrigins = isProduction
    ? configuredOrigins.filter(
        (origin) =>
          origin.startsWith('https://') ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1'),
      )
    : configuredOrigins;

  if (isProduction && !process.env.JWT_SECRET?.trim()) {
    throw new Error('Configura JWT_SECRET en produccion antes de iniciar.');
  }

  logger.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`PORT: ${port}`);
  logger.log(`DATABASE_URL configurada: ${process.env.DATABASE_URL?.trim() ? 'si' : 'no'}`);
  logger.log(`Database host: ${getDatabaseHost(process.env.DATABASE_URL)}`);

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (isProduction && configuredOrigins.length === 0) {
    throw new Error(
      'Configura FRONTEND_URL o CORS_ORIGINS en produccion antes de iniciar el backend.',
    );
  }

  if (isProduction) {
    const insecureOrigins = configuredOrigins.filter(
      (origin) =>
        origin.startsWith('http://') &&
        !origin.startsWith('http://localhost') &&
        !origin.startsWith('http://127.0.0.1'),
    );

    if (insecureOrigins.length > 0) {
      logger.warn(
        `Origenes HTTP ignorados en produccion: ${insecureOrigins.join(', ')}. Configura URLs HTTPS en Railway.`,
      );
    }
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `Origen no permitido por CORS: ${origin}. Origenes permitidos: ${allowedOrigins.join(', ')}`,
        ),
        false,
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Content-Disposition'],
  });

  try {
    const server = await app.listen(port, '0.0.0.0');
    logger.log(`[BOOT] Listening on 0.0.0.0:${port}`);
    logger.log(`[BOOT] Server address: ${JSON.stringify(server.address())}`);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'EADDRINUSE') {
      throw new Error(
        `El puerto ${port} ya esta en uso. Libera ese puerto antes de iniciar el backend o revisa PORT en backend/.env.`,
      );
    }

    throw error;
  }
}

bootstrap().catch((error) => {
  console.error('[BOOT] Failed to start PCSystemStore backend', error);
  process.exit(1);
});
