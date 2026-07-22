import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  inspectPostgresConnectionString,
  normalizePostgresConnectionString,
} from './database-url';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);
  private isDatabaseConnected = false;
  private disconnectPromise: Promise<void> | undefined;
  private shutdownSignal: string | undefined;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be configured for Prisma runtime.');
    }
    const connectionString = normalizePostgresConnectionString(databaseUrl);

    super({
      adapter: new PrismaPg({
        connectionString,
      }),
    });
  }

  async onModuleInit() {
    const databaseUrl = process.env.DATABASE_URL;
    const normalizedDatabaseUrl = databaseUrl
      ? normalizePostgresConnectionString(databaseUrl)
      : undefined;
    const databaseDiagnostics = inspectPostgresConnectionString(normalizedDatabaseUrl);

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
        `sslmode=${databaseDiagnostics.sslMode}.`,
        isReachabilityError
          ? 'Prisma devolvio P1001: el host existe en la configuracion, pero no responde desde esta maquina o desde esta red.'
          : 'Prisma no pudo inicializar la conexion con la base de datos.',
        'Revisa DATABASE_URL, sslmode=verify-full, credenciales, conectividad local, firewall y el estado del proyecto en Neon.',
      ].join(' ');

      this.logger.error(message);

      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
    }
  }

  async onModuleDestroy() {
    this.disconnectPromise ??= this.disconnect();
    await this.disconnectPromise;
  }

  beforeApplicationShutdown(signal?: string) {
    if (!signal || this.shutdownSignal) {
      return;
    }

    this.shutdownSignal = signal;
    this.logger.log(`[BOOT] ${signal} received. Closing backend...`);
  }

  onApplicationShutdown(signal?: string) {
    if (signal && signal === this.shutdownSignal) {
      this.logger.log('[BOOT] Backend closed successfully.');
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

  private async disconnect(): Promise<void> {
    await this.$disconnect();
    this.isDatabaseConnected = false;
    this.logger.log('Prisma desconectado.');
  }
}
