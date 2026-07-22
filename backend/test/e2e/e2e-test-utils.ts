import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { qaUsers, resetQaDatabase, seedQaDatabase } from '../fixtures/seed-qa';

export const hasDatabaseUrlTest = Boolean(process.env.DATABASE_URL_TEST?.trim());
export const describeWithTestDb = hasDatabaseUrlTest ? describe : describe.skip;

export type E2eContext = {
  app: INestApplication;
  prisma: PrismaService;
  tokens: {
    admin: string;
    editor: string;
    customer: string;
  };
};

export async function createQaApp(): Promise<E2eContext> {
  if (!process.env.DATABASE_URL_TEST?.trim()) {
    throw new Error('DATABASE_URL_TEST no configurado.');
  }

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  const prisma = app.get(PrismaService);
  await resetQaDatabase(prisma);
  await seedQaDatabase(prisma);

  const http = app.getHttpServer();
  const [adminLogin, editorLogin, customerLogin] = await Promise.all([
    request(http).post('/users/admin-login').send(qaUsers.admin),
    request(http).post('/users/admin-login').send(qaUsers.editor),
    request(http).post('/users/customer-login').send(qaUsers.customer),
  ]);

  return {
    app,
    prisma,
    tokens: {
      admin: adminLogin.body.token,
      editor: editorLogin.body.token,
      customer: customerLogin.body.token,
    },
  };
}

export async function closeQaApp(context?: E2eContext) {
  if (!context) {
    return;
  }
  await context.app.close();
}
