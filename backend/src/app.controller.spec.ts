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
});
