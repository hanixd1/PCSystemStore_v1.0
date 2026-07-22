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
import { ProductImportController } from '../src/products/import/product-import.controller';
import { ProductImportService } from '../src/products/import/product-import.service';
import { ProductTemplateService } from '../src/products/import/product-template.service';
import { ProductsService } from '../src/products/products.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CloudinaryService } from '../src/uploads/cloudinary.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('Security (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const validProduct = {
    sku: 'PCS-CPU-R7-7700X-QA',
    name: 'Procesador Ryzen 7 7700X',
    description: 'Procesador de alto rendimiento con 8 nucleos y excelente capacidad multitarea.',
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

  const parseBinaryResponse = (
    response: NodeJS.ReadableStream,
    callback: (error: Error | null, body: Buffer) => void,
  ) => {
    const chunks: Buffer[] = [];
    response.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    response.on('end', () => callback(null, Buffer.concat(chunks)));
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
  const cloudinaryServiceMock = {
    uploadImage: jest.fn(async () => ({
      secureUrl: 'https://example.com/uploaded.jpg',
    })),
  };
  const productImportServiceMock = {
    preview: jest.fn(),
    confirm: jest.fn(),
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
    createEditor: jest.fn((body: Record<string, unknown>) => ({
      id: 'editor-created-1',
      ...body,
      role: 'EDITOR',
    })),
    findAll: jest.fn(() => []),
    findInternalUsers: jest.fn(() => [
      {
        id: 'admin-1',
        name: 'Admin QA',
        email: 'admin@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      },
      {
        id: 'editor-1',
        name: 'Editor QA',
        email: 'editor@example.com',
        role: 'EDITOR',
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]),
    findEditors: jest.fn(() => [
      {
        id: 'editor-1',
        name: 'Editor QA',
        email: 'editor@example.com',
        role: 'EDITOR',
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]),
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

    const moduleBuilder = Test.createTestingModule({
      imports: [AuthModule],
      controllers: [AppController, ProductsController, ProductImportController, UsersController],
      providers: [
        AppService,
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: ProductImportService, useValue: productImportServiceMock },
        ProductTemplateService,
        { provide: CloudinaryService, useValue: cloudinaryServiceMock },
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
    });
    const moduleFixture: TestingModule = await moduleBuilder
      .overrideProvider(PrismaService)
      .useValue({
        getConnectionState: jest.fn(() => 'mocked'),
        ping: jest.fn(async () => true),
      })
      .compile();

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
    return request(app.getHttpServer()).post('/products').send(validProduct).expect(401);
  });

  it('GET /products/import/template sin token devuelve 401', () => {
    return request(app.getHttpServer())
      .get('/products/import/template')
      .query({ category: 'COMPONENTES', productType: 'Procesador (CPU)' })
      .expect(401);
  });

  it('GET /products/import/template con token editor devuelve 403', async () => {
    const editorToken = await jwtService.signAsync({
      sub: 'editor-1',
      email: 'editor@example.com',
      role: 'EDITOR',
    });

    return request(app.getHttpServer())
      .get('/products/import/template')
      .query({ category: 'COMPONENTES', productType: 'Procesador (CPU)' })
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
  });

  it('GET /products/import/template con token admin devuelve Excel descargable', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const response = await request(app.getHttpServer())
      .get('/products/import/template')
      .query({ category: 'COMPONENTES', productType: 'Procesador (CPU)' })
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse(parseBinaryResponse)
      .expect(200);

    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers['content-disposition']).toContain('plantilla-procesador.xlsx');
    expect(response.headers['content-length']).toBeDefined();
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toBe(0x50);
    expect(response.body[1]).toBe(0x4b);
  });

  it('GET /products/import/template sin category o productType devuelve 400', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    return request(app.getHttpServer())
      .get('/products/import/template')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('GET /products/import/template con productType invalido devuelve 400', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const response = await request(app.getHttpServer())
      .get('/products/import/template')
      .query({ category: 'COMPONENTES', productType: 'Tipo inexistente' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.headers['content-type']).not.toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
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

  it('GET /users/internal sin token devuelve 401', () => {
    return request(app.getHttpServer()).get('/users/internal').expect(401);
  });

  it('GET /users/internal con token de cliente devuelve 403', async () => {
    const customerToken = await jwtService.signAsync({
      sub: 'customer-1',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    });

    return request(app.getHttpServer())
      .get('/users/internal')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('GET /users/internal con token editor devuelve 403', async () => {
    const editorToken = await jwtService.signAsync({
      sub: 'editor-1',
      email: 'editor@example.com',
      role: 'EDITOR',
    });

    return request(app.getHttpServer())
      .get('/users/internal')
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
  });

  it('GET /users/internal con token admin devuelve ADMIN y EDITOR sin clientes', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const response = await request(app.getHttpServer())
      .get('/users/internal')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'ADMIN' }),
        expect.objectContaining({ role: 'EDITOR' }),
      ]),
    );
    expect(response.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'CUSTOMER' })]),
    );
  });

  it('GET /users/editors sin token devuelve 401', () => {
    return request(app.getHttpServer()).get('/users/editors').expect(401);
  });

  it('GET /users/editors con token de cliente devuelve 403', async () => {
    const customerToken = await jwtService.signAsync({
      sub: 'customer-1',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    });

    return request(app.getHttpServer())
      .get('/users/editors')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('GET /users/editors con token editor devuelve 403', async () => {
    const editorToken = await jwtService.signAsync({
      sub: 'editor-1',
      email: 'editor@example.com',
      role: 'EDITOR',
    });

    return request(app.getHttpServer())
      .get('/users/editors')
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
  });

  it('GET /users/editors con token admin devuelve solo editores', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const response = await request(app.getHttpServer())
      .get('/users/editors')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'EDITOR' })]),
    );
    expect(response.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'CUSTOMER' })]),
    );
  });

  it('POST /users/editors con token admin crea rol EDITOR', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const response = await request(app.getHttpServer())
      .post('/users/editors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Editor Nuevo',
        email: 'nuevo-editor@example.com',
        password: 'frase-segura-123',
        role: 'ADMIN',
      })
      .expect(201);

    expect(response.body).toEqual(expect.objectContaining({ role: 'EDITOR' }));
  });

  it('POST /users/internal con token admin crea EDITOR', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const response = await request(app.getHttpServer())
      .post('/users/internal')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Editor Nuevo',
        email: 'editor-internal@example.com',
        password: 'frase-segura-123',
        role: 'EDITOR',
      })
      .expect(201);

    expect(response.body).toEqual(expect.objectContaining({ role: 'EDITOR' }));
  });

  it('POST /users/internal con token admin crea ADMIN', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const response = await request(app.getHttpServer())
      .post('/users/internal')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Nuevo',
        email: 'admin-internal@example.com',
        password: 'frase-segura-123',
        role: 'ADMIN',
      })
      .expect(201);

    expect(response.body).toEqual(expect.objectContaining({ role: 'ADMIN' }));
  });

  it('POST /users/internal con token editor devuelve 403', async () => {
    const editorToken = await jwtService.signAsync({
      sub: 'editor-1',
      email: 'editor@example.com',
      role: 'EDITOR',
    });

    return request(app.getHttpServer())
      .post('/users/internal')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        name: 'No permitido',
        email: 'forbidden-editor@example.com',
        password: 'frase-segura-123',
        role: 'EDITOR',
      })
      .expect(403);
  });

  it('POST /users/internal rechaza role EMPLOYEE', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    return request(app.getHttpServer())
      .post('/users/internal')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Empleado legacy',
        email: 'legacy@example.com',
        password: 'frase-segura-123',
        role: 'EMPLOYEE',
      })
      .expect(400);
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
