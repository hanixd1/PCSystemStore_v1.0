import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureHttpApplication } from './app.setup';
import { inspectPostgresConnectionString } from './prisma/database-url';

function registerFatalErrorHandlers(app: NestExpressApplication, logger: Logger) {
  let fatalShutdown: Promise<void> | undefined;

  const closeAfterFatalError = (
    event: 'uncaughtException' | 'unhandledRejection',
    reason: unknown,
  ) => {
    if (fatalShutdown) {
      return;
    }

    process.exitCode = 1;
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error(`[BOOT] ${event}`, error.stack || error.message);
    fatalShutdown = app
      .close()
      .then(() => logger.log('[BOOT] Backend closed after a fatal error.'))
      .catch((shutdownError: unknown) => {
        const message =
          shutdownError instanceof Error ? shutdownError.stack : String(shutdownError);
        logger.error('[BOOT] Error while closing backend after a fatal error.', message);
      });
  };

  process.once('uncaughtException', (error) => {
    closeAfterFatalError('uncaughtException', error);
  });
  process.once('unhandledRejection', (reason) => {
    closeAfterFatalError('unhandledRejection', reason);
  });
}

function getPort(): number {
  const rawPort = process.env.PORT ?? '3001';
  const normalizedPort = rawPort.trim();
  const port = Number.parseInt(normalizedPort, 10);

  if (!/^\d+$/.test(normalizedPort) || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  return port;
}

async function bootstrap() {
  console.log('[BOOT] Starting PCSystemStore backend...');
  console.log(`[BOOT] NODE_ENV=${process.env.NODE_ENV || 'development'}`);

  const port = getPort();
  const logger = new Logger('Bootstrap');
  logger.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`PORT: ${port}`);
  logger.log(`DATABASE_URL configurada: ${process.env.DATABASE_URL?.trim() ? 'si' : 'no'}`);
  logger.log(`Database host: ${inspectPostgresConnectionString(process.env.DATABASE_URL).host}`);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.enableShutdownHooks(['SIGINT', 'SIGTERM']);

  configureHttpApplication(app);

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

  try {
    const server = await app.listen(port, '0.0.0.0');
    logger.log(`[BOOT] Listening on 0.0.0.0:${port}`);
    logger.log(`Backend running at http://localhost:${port}`);
    logger.log(`[BOOT] Server address: ${JSON.stringify(server.address())}`);
    registerFatalErrorHandlers(app, logger);
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
  process.exitCode = 1;
});
