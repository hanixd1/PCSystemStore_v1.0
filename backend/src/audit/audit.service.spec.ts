import { AuditService } from './audit.service';

describe('AuditService API', () => {
  const createService = () => {
    const prisma = {
      actionLog: {
        create: jest.fn(async (args) => args),
        findMany: jest.fn(async () => []),
      },
    };

    return {
      service: new AuditService(prisma as any),
      prisma,
    };
  };

  it('AUD-01 registra evento de producto con actor, modulo y entidad', async () => {
    const { service, prisma } = createService();

    await service.log({
      actorId: 'admin-1',
      action: 'CREATE_PRODUCT',
      module: 'PRODUCTS',
      entityType: 'PRODUCT',
      entityId: 'product-1',
      entityName: 'Producto QA',
      description: 'Se creo producto QA',
    });

    expect(prisma.actionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'admin-1',
        action: 'CREATE_PRODUCT',
        module: 'PRODUCTS',
        entityType: 'PRODUCT',
        entityId: 'product-1',
        entityName: 'Producto QA',
      }),
    });
  });

  it('AUD-02/03 registra oldValue/newValue y stockBefore/stockAfter', async () => {
    const { service, prisma } = createService();

    await service.log({
      actorId: 'admin-1',
      action: 'UPDATE_STOCK',
      module: 'INVENTORY',
      entityType: 'PRODUCT',
      entityId: 'product-1',
      fieldName: 'stock',
      oldValue: 10,
      newValue: 4,
      stockBefore: 10,
      stockAfter: 4,
      description: 'Cambio stock de 10 a 4',
    });

    expect(prisma.actionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        oldValue: '10',
        newValue: '4',
        stockBefore: 10,
        stockAfter: 4,
      }),
    });
  });

  it('AUD-07 filtra login/register de clientes en auditoria administrativa', async () => {
    const { service, prisma } = createService();

    await service.findByScope('security', 50);

    expect(prisma.actionLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          module: { in: ['SECURITY', 'EMPLOYEES'] },
          NOT: [
            { action: 'LOGIN', user: { role: 'CUSTOMER' } },
            { action: 'REGISTER', user: { role: 'CUSTOMER' } },
          ],
        }),
        take: 50,
      }),
    );
  });
});
