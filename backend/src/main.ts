import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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
  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;
  const logger = new Logger('Bootstrap');
  const frontendUrl = parseOrigins(process.env.FRONTEND_URL);
  const allowedOrigins = [
    ...new Set([
      ...parseOrigins(process.env.CORS_ORIGINS),
      ...parseOrigins(process.env.CORS_ORIGIN),
      ...frontendUrl,
    ]),
  ];

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

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error(
      'Configura FRONTEND_URL o CORS_ORIGINS en produccion antes de iniciar el backend.',
    );
  }

  if (isProduction) {
    const insecureOrigins = allowedOrigins.filter((origin) => origin.startsWith('http://'));

    if (insecureOrigins.length > 0) {
      throw new Error('HTTP origins are not allowed in production CORS configuration.');
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
  });

  try {
    await app.listen(port);
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
bootstrap();
