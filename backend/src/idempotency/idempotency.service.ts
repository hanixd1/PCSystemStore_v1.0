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
    const normalizedKey = key?.trim();
    if (!normalizedKey) {
      throw new BadRequestException('Idempotency-Key es obligatorio para esta operacion.');
    }

    const normalizedMethod = method.toUpperCase();
    const requestHash = this.buildRequestHash(body, userId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);

    let created = false;
    let record = await this.prisma.idempotencyKey.findUnique({
      where: {
        key_route_method: {
          key: normalizedKey,
          route,
          method: normalizedMethod,
        },
      },
    });

    if (!record) {
      try {
        record = await this.prisma.idempotencyKey.create({
          data: {
            key: normalizedKey,
            route,
            method: normalizedMethod,
            userId,
            requestHash,
            status: STATUS_PROCESSING,
            lockedAt: now,
            expiresAt,
          },
        });
        created = true;
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        record = await this.prisma.idempotencyKey.findUnique({
          where: {
            key_route_method: {
              key: normalizedKey,
              route,
              method: normalizedMethod,
            },
          },
        });
      }
    }

    if (!record) {
      throw new ConflictException('La operacion ya esta siendo procesada.');
    }

    if (!created) {
      if (record.requestHash !== requestHash) {
        throw new ConflictException(
          'La clave de idempotencia ya fue usada con una solicitud diferente.',
        );
      }

      if (record.status === STATUS_COMPLETED) {
        return {
          body: record.responseBody as T,
          statusCode: record.statusCode ?? successStatusCode,
          replayed: true,
        };
      }

      if (record.status === STATUS_PROCESSING) {
        throw new ConflictException('La operacion ya esta siendo procesada.');
      }

      throw new ConflictException(
        'La operacion fallo previamente. Genera una nueva clave para un nuevo intento.',
      );
    }

    try {
      const result = await handler();
      const responseBody = toJsonValue(result);

      await this.prisma.idempotencyKey.update({
        where: { id: record.id },
        data: {
          status: STATUS_COMPLETED,
          responseBody,
          statusCode: successStatusCode,
          completedAt: new Date(),
        },
      });

      return {
        body: result,
        statusCode: successStatusCode,
        replayed: false,
      };
    } catch (error) {
      const statusCode = error instanceof HttpException ? error.getStatus() : 500;
      const response =
        error instanceof HttpException ? error.getResponse() : { message: 'Error interno' };

      await this.prisma.idempotencyKey.update({
        where: { id: record.id },
        data: {
          status: STATUS_FAILED,
          responseBody: toJsonValue(response),
          statusCode,
          completedAt: new Date(),
        },
      });

      throw error;
    }
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
