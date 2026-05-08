import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditPayload = {
  actorId: string;
  action: string;
  module: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  fieldName?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  stockBefore?: number | null;
  stockAfter?: number | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(data: AuditPayload) {
    return this.prisma.actionLog.create({
      data: {
        userId: data.actorId,
        action: data.action,
        module: data.module,
        entity: data.entityType,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        fieldName: data.fieldName,
        oldValue: data.oldValue === null || data.oldValue === undefined ? null : String(data.oldValue),
        newValue: data.newValue === null || data.newValue === undefined ? null : String(data.newValue),
        stockBefore: data.stockBefore ?? null,
        stockAfter: data.stockAfter ?? null,
        details: data.description,
        metadata: data.metadata,
      },
    });
  }

  findByScope(scope: 'security' | 'products', limit = 100) {
    const modules =
      scope === 'security'
        ? ['SECURITY', 'EMPLOYEES']
        : ['PRODUCTS', 'INVENTORY', 'SALES', 'PAYMENTS', 'BRANDING', 'BANNERS'];

    return this.prisma.actionLog.findMany({
      where: {
        module: { in: modules },
        NOT: [
          { action: 'LOGIN', user: { role: 'CUSTOMER' } },
          { action: 'REGISTER', user: { role: 'CUSTOMER' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }
}
