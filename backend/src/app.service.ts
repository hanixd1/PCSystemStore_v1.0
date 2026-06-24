import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

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
