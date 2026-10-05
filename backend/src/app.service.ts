import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  private getPublicBuildValue(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    if (!normalized || !/^[a-zA-Z0-9._/-]{1,128}$/.test(normalized)) {
      return fallback;
    }
    return normalized;
  }

  getHello() {
    return {
      service: 'pcsystemstore-backend',
      status: 'ok',
    };
  }

  getHealth() {
    return {
      status: 'ok',
      api: 'running',
      service: 'pcsystemstore-backend',
      timestamp: new Date().toISOString(),
    };
  }

  getVersion() {
    const version = this.getPublicBuildValue(
      process.env.APP_VERSION ?? process.env.npm_package_version,
      'unknown',
    );
    const commit = this.getPublicBuildValue(
      process.env.COMMIT_SHA ??
        process.env.RAILWAY_GIT_COMMIT_SHA ??
        process.env.VERCEL_GIT_COMMIT_SHA,
      'unknown',
    );
    const environment = this.getPublicBuildValue(process.env.NODE_ENV, 'development');

    return {
      service: 'pcsystemstore-backend',
      version,
      commit,
      environment,
      timestamp: new Date().toISOString(),
    };
  }

  async getDatabaseHealth() {
    let isConnected = false;

    try {
      isConnected = await this.prisma.ping();
    } catch {
      isConnected = false;
    }

    return {
      status: isConnected ? 'ok' : 'error',
      api: 'running',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
