import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ADMIN_SESSION_COOKIE, CUSTOMER_SESSION_COOKIE } from '../../src/auth/auth-cookies';
import { PrismaService } from '../../src/prisma/prisma.service';
import { qaUsers, resetQaDatabase, seedQaDatabase } from '../fixtures/seed-qa';

export const hasDatabaseUrlTest = Boolean(process.env.DATABASE_URL_TEST?.trim());
export const describeWithTestDb = hasDatabaseUrlTest ? describe : describe.skip;

/** Session JWT from the httpOnly Set-Cookie header (the JSON body never carries it). */
export function getSessionCookieToken(response: request.Response, cookieName: string): string {
  const header = response.headers['set-cookie'] as unknown as string[] | string | undefined;
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const cookie = cookies.find((value) => value.startsWith(`${cookieName}=`));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1).split(';')[0]) : '';
}

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
      admin: getSessionCookieToken(adminLogin, ADMIN_SESSION_COOKIE),
      editor: getSessionCookieToken(editorLogin, ADMIN_SESSION_COOKIE),
      customer: getSessionCookieToken(customerLogin, CUSTOMER_SESSION_COOKIE),
    },
  };
}

export async function closeQaApp(context?: E2eContext) {
  if (!context) {
    return;
  }
  await context.app.close();
}
