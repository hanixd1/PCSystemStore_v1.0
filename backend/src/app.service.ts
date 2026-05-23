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
      database: this.prisma.getConnectionState(),
    };
  }

  async getDatabaseHealth() {
    const isConnected = await this.prisma.ping();

    return {
      status: isConnected ? 'ok' : 'error',
      api: 'running',
      database: isConnected ? 'connected' : 'disconnected',
    };
  }
}
