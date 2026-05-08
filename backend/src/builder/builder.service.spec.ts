import { NotFoundException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { BuilderService } from './builder.service';

describe('BuilderService', () => {
  const createPrismaMock = () => ({
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  });

  it('filtra motherboards por socket del CPU seleccionado', async () => {
    const prisma = createPrismaMock();
    prisma.product.findUnique.mockResolvedValue({
      id: 'cpu-1',
      cpuSpecs: { socket: 'AM5' },
    });
    prisma.product.findMany.mockResolvedValue([]);

    const service = new BuilderService(prisma as any);
    await service.getCompatibleMotherboards('cpu-1');

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {
        category: CategoryType.MOTHERBOARD,
        stock: { gt: 0 },
        motherboardSpecs: { socket: 'AM5' },
      },
      include: { motherboardSpecs: true },
    });
  });

  it('lanza NotFoundException si el CPU no tiene especificaciones', async () => {
    const prisma = createPrismaMock();
    prisma.product.findUnique.mockResolvedValue(null);

    const service = new BuilderService(prisma as any);
    await expect(service.getCompatibleMotherboards('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('filtra RAM por tipo de memoria de la motherboard', async () => {
    const prisma = createPrismaMock();
    prisma.product.findUnique.mockResolvedValue({
      id: 'board-1',
      motherboardSpecs: { memoryType: 'DDR5' },
    });
    prisma.product.findMany.mockResolvedValue([]);

    const service = new BuilderService(prisma as any);
    await service.getCompatibleRam('board-1');

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {
        category: CategoryType.RAM,
        stock: { gt: 0 },
        ramSpecs: { memoryType: 'DDR5' },
      },
      include: { ramSpecs: true },
    });
  });
});
