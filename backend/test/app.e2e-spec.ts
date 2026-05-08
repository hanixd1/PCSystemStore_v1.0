import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('Security (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const validProduct = {
    name: 'Procesador Ryzen 7 7700X',
    description:
      'Procesador de alto rendimiento con 8 nucleos y excelente capacidad multitarea.',
    price: 1499.9,
    stock: 8,
    category: 'CPU',
    socket: 'AM5',
    cores: 8,
    frequency: '4.5',
    tdp: 105,
    integratedGraphics: true,
    includesCooler: false,
    image: 'https://example.com/cpu.jpg',
  };

  const productsServiceMock = {
    create: jest.fn((body: unknown) => ({
      id: 'product-1',
      ...(body as Record<string, unknown>),
    })),
    findAll: jest.fn(() => []),
    findOne: jest.fn((id: string) => ({ id })),
    update: jest.fn((id: string, body: unknown) => ({
      id,
      ...(body as Record<string, unknown>),
    })),
    remove: jest.fn((id: string) => ({ id })),
  };

  const usersServiceMock = {
    login: jest.fn(),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    create: jest.fn((body: unknown) => ({
      id: 'user-1',
      ...(body as Record<string, unknown>),
    })),
    findAll: jest.fn(() => []),
    getAuditLogs: jest.fn(() => []),
    toggleStatus: jest.fn((id: string) => ({ id, status: 'INACTIVE' })),
    updateUser: jest.fn((id: string, body: unknown) => ({
      id,
      ...(body as Record<string, unknown>),
    })),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_EXPIRES_IN = '1d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [AppController, ProductsController, UsersController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            getConnectionState: jest.fn(() => 'mocked'),
            ping: jest.fn(async () => true),
          },
        },
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /products sigue publico', () => {
    return request(app.getHttpServer()).get('/products').expect(200);
  });

  it('POST /products sin token devuelve 401', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send(validProduct)
      .expect(401);
  });

  it('GET /users con token de cliente devuelve 403', async () => {
    const customerToken = await jwtService.signAsync({
      sub: 'customer-1',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    });

    return request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('GET /users con token admin devuelve 200', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    return request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('POST /products con token editor devuelve 201', async () => {
    const editorToken = await jwtService.signAsync({
      sub: 'editor-1',
      email: 'editor@example.com',
      role: 'EDITOR',
    });

    return request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send(validProduct)
      .expect(201);
  });
});
