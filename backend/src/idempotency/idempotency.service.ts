import { BadRequestException, ConflictException, HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const IDEMPOTENCY_TTL_HOURS = 24;
const STATUS_PROCESSING = 'PROCESSING';
const STATUS_COMPLETED = 'COMPLETED';
const STATUS_FAILED = 'FAILED';

type IdempotencyRunOptions<T> = {
  key?: string;
  route: string;
  method: string;
  body?: unknown;
  userId?: string;
  successStatusCode: number;
  handler: () => Promise<T>;
};

export type IdempotencyResult<T> = {
  body: T;
  statusCode: number;
  replayed: boolean;
};

type IdempotencyRecord = {
  id: string;
  requestHash: string;
  status: string;
  responseBody: Prisma.JsonValue | null;
  statusCode: number | null;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, current) =>
      typeof current === 'bigint' ? current.toString() : current,
    ),
  ) as Prisma.InputJsonValue;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  buildRequestHash(body: unknown, userId?: string) {
    const normalizedPayload = stableStringify({
      body: body ?? {},
      userId: userId ?? null,
    });
    return createHash('sha256').update(normalizedPayload).digest('hex');
  }

  async run<T>({
    key,
    route,
    method,
    body,
    userId,
    successStatusCode,
    handler,
  }: IdempotencyRunOptions<T>): Promise<IdempotencyResult<T>> {
    const normalizedKey = this.normalizeKeyOrThrow(key);
    const normalizedMethod = method.toUpperCase();
    const requestHash = this.buildRequestHash(body, userId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);
    const { record, created } = await this.findOrCreateProcessingRecord({
      key: normalizedKey,
      route,
      method: normalizedMethod,
      userId,
      requestHash,
      now,
      expiresAt,
    });

    if (!created) {
      return this.resolveExistingRecord<T>(record, requestHash, successStatusCode);
    }

    return this.executeAndPersist(record.id, successStatusCode, handler);
  }

  private normalizeKeyOrThrow(key?: string): string {
    const normalizedKey = key?.trim();

    if (!normalizedKey) {
      throw new BadRequestException('Idempotency-Key es obligatorio para esta operacion.');
    }

    return normalizedKey;
  }

  private async findOrCreateProcessingRecord({
    key,
    route,
    method,
    userId,
    requestHash,
    now,
    expiresAt,
  }: {
    key: string;
    route: string;
    method: string;
    userId?: string;
    requestHash: string;
    now: Date;
    expiresAt: Date;
  }): Promise<{ record: IdempotencyRecord; created: boolean }> {
    const where = {
      key_route_method: {
        key,
        route,
        method,
      },
    };
    const existingRecord = await this.prisma.idempotencyKey.findUnique({ where });

    if (existingRecord) {
      return { record: existingRecord, created: false };
    }

    try {
      const createdRecord = await this.prisma.idempotencyKey.create({
        data: {
          key,
          route,
          method,
          userId,
          requestHash,
          status: STATUS_PROCESSING,
          lockedAt: now,
          expiresAt,
        },
      });

      return { record: createdRecord, created: true };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrentRecord = await this.prisma.idempotencyKey.findUnique({ where });

      if (!concurrentRecord) {
        throw new ConflictException('La operacion ya esta siendo procesada.');
      }

      return { record: concurrentRecord, created: false };
    }
  }

  private resolveExistingRecord<T>(
    record: IdempotencyRecord,
    requestHash: string,
    successStatusCode: number,
  ): IdempotencyResult<T> {
    this.validatePayloadHashOrThrow(record, requestHash);

    if (record.status === STATUS_COMPLETED) {
      return this.buildCachedResponse(record, successStatusCode);
    }

    if (record.status === STATUS_PROCESSING) {
      throw new ConflictException('La operacion ya esta siendo procesada.');
    }

    throw new ConflictException(
      'La operacion fallo previamente. Genera una nueva clave para un nuevo intento.',
    );
  }

  private validatePayloadHashOrThrow(record: IdempotencyRecord, requestHash: string): void {
    if (record.requestHash !== requestHash) {
      throw new ConflictException(
        'La clave de idempotencia ya fue usada con una solicitud diferente.',
      );
    }
  }

  private buildCachedResponse<T>(
    record: IdempotencyRecord,
    successStatusCode: number,
  ): IdempotencyResult<T> {
    return {
      body: record.responseBody as T,
      statusCode: record.statusCode ?? successStatusCode,
      replayed: true,
    };
  }

  private async executeAndPersist<T>(
    recordId: string,
    successStatusCode: number,
    handler: () => Promise<T>,
  ): Promise<IdempotencyResult<T>> {
    try {
      const result = await handler();
      await this.persistSuccessfulResult(recordId, result, successStatusCode);

      return {
        body: result,
        statusCode: successStatusCode,
        replayed: false,
      };
    } catch (error) {
      await this.persistFailedResult(recordId, error);
      throw error;
    }
  }

  private async persistSuccessfulResult<T>(
    recordId: string,
    result: T,
    successStatusCode: number,
  ): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id: recordId },
      data: {
        status: STATUS_COMPLETED,
        responseBody: toJsonValue(result),
        statusCode: successStatusCode,
        completedAt: new Date(),
      },
    });
  }

  private async persistFailedResult(recordId: string, error: unknown): Promise<void> {
    const statusCode = error instanceof HttpException ? error.getStatus() : 500;
    const response =
      error instanceof HttpException ? error.getResponse() : { message: 'Error interno' };

    await this.prisma.idempotencyKey.update({
      where: { id: recordId },
      data: {
        status: STATUS_FAILED,
        responseBody: toJsonValue(response),
        statusCode,
        completedAt: new Date(),
      },
    });
  }

  deleteExpiredKeys(now = new Date()) {
    return this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: now } },
    });
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
