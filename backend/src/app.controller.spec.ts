import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prismaMock: { getConnectionState: jest.Mock; ping: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      getConnectionState: jest.fn(() => 'mocked'),
      ping: jest.fn(async () => true),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns service metadata', () => {
      expect(appController.getHello()).toEqual({
        service: 'pcsystemstore-backend',
        status: 'ok',
      });
    });
  });

  describe('health', () => {
    it('returns liveness without touching Prisma', () => {
      const response = appController.getHealth();

      expect(response).toMatchObject({
        status: 'ok',
        api: 'running',
        service: 'pcsystemstore-backend',
      });
      expect(response.timestamp).toEqual(expect.any(String));
      expect(prismaMock.getConnectionState).not.toHaveBeenCalled();
      expect(prismaMock.ping).not.toHaveBeenCalled();
    });

    it('checks database only in readiness endpoints', async () => {
      await expect(appController.getDatabaseHealth()).resolves.toMatchObject({
        status: 'ok',
        api: 'running',
        database: 'connected',
      });
      await expect(appController.getReadiness()).resolves.toMatchObject({
        status: 'ok',
        api: 'running',
        database: 'connected',
      });
      expect(prismaMock.ping).toHaveBeenCalledTimes(2);
    });
  });

  describe('version', () => {
    it('returns only public build metadata without touching Prisma', () => {
      const previousVersion = process.env.APP_VERSION;
      const previousCommit = process.env.COMMIT_SHA;
      const previousEnvironment = process.env.NODE_ENV;
      process.env.APP_VERSION = '2026.07.30';
      process.env.COMMIT_SHA = 'abc123def456';
      process.env.NODE_ENV = 'production';

      try {
        expect(appController.getVersion()).toMatchObject({
          service: 'pcsystemstore-backend',
          version: '2026.07.30',
          commit: 'abc123def456',
          environment: 'production',
          timestamp: expect.any(String),
        });
        expect(prismaMock.ping).not.toHaveBeenCalled();
      } finally {
        if (previousVersion === undefined) {
          delete process.env.APP_VERSION;
        } else {
          process.env.APP_VERSION = previousVersion;
        }
        if (previousCommit === undefined) {
          delete process.env.COMMIT_SHA;
        } else {
          process.env.COMMIT_SHA = previousCommit;
        }
        if (previousEnvironment === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = previousEnvironment;
        }
      }
    });
  });
});
