import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';

  const configuredOrigins = [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGIN?.split(',') ?? [])]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));

  const allowedOrigins = [...new Set(configuredOrigins)];

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error(
      'Configura FRONTEND_URL o CORS_ORIGIN en produccion antes de iniciar el backend.',
    );
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(Number(process.env.PORT) || 3000);
}
bootstrap();
