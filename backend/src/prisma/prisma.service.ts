import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

function getDatabaseDiagnostics(databaseUrl?: string) {
  if (!databaseUrl?.trim()) {
    return {
      configured: false,
      host: 'missing',
      protocol: 'missing',
      usesSsl: false,
    };
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    const params = parsedUrl.searchParams;

    return {
      configured: true,
      host: parsedUrl.host || 'unknown',
      protocol: parsedUrl.protocol.replace(':', '') || 'unknown',
      usesSsl: params.get('sslmode') === 'require',
    };
  } catch {
    return {
      configured: true,
      host: 'invalid-url',
      protocol: 'invalid-url',
      usesSsl: databaseUrl.includes('sslmode=require'),
    };
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private isDatabaseConnected = false;

  async onModuleInit() {
    const databaseDiagnostics = getDatabaseDiagnostics(process.env.DATABASE_URL);

    try {
      await this.$connect();
      this.isDatabaseConnected = true;
      this.logger.log(
        `Prisma conectado a ${databaseDiagnostics.protocol}://${databaseDiagnostics.host}`,
      );
    } catch (error) {
      this.isDatabaseConnected = false;

      const prismaError = error as Prisma.PrismaClientInitializationError;
      const isReachabilityError = prismaError?.errorCode === 'P1001';
      const message = [
        `No se pudo conectar a PostgreSQL/Neon en ${databaseDiagnostics.host}.`,
        `DATABASE_URL configurada: ${databaseDiagnostics.configured ? 'si' : 'no'}.`,
        `sslmode=require: ${databaseDiagnostics.usesSsl ? 'si' : 'no'}.`,
        isReachabilityError
          ? 'Prisma devolvio P1001: el host existe en la configuracion, pero no responde desde esta maquina o desde esta red.'
          : 'Prisma no pudo inicializar la conexion con la base de datos.',
        'Revisa DATABASE_URL, sslmode=require, credenciales, conectividad local, firewall y el estado del proyecto en Neon.',
      ].join(' ');

      this.logger.error(message);

      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
    }
  }

  getConnectionState() {
    return this.isDatabaseConnected ? 'connected' : 'disconnected';
  }

  async ping() {
    try {
      await this.$queryRaw`SELECT 1`;
      this.isDatabaseConnected = true;
      return true;
    } catch {
      this.isDatabaseConnected = false;
      return false;
    }
  }
}
