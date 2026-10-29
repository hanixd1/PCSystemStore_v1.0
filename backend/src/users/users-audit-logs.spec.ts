import { UsersService } from './users.service';

describe('UsersService.getAuditLogs', () => {
  const createService = () => {
    const prisma = { actionLog: { findMany: jest.fn(async () => []) } };
    return { service: new UsersService(prisma as any, {} as any), prisma };
  };

  it('nunca descarga la tabla completa', async () => {
    const { service, prisma } = createService();

    await service.getAuditLogs();
    await service.getAuditLogs(3, 50_000);

    expect(prisma.actionLog.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ take: 200, skip: 0 }),
    );
    expect(prisma.actionLog.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ take: 200, skip: 400 }),
    );
  });
});
