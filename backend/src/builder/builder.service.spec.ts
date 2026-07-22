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
    await expect(service.getCompatibleMotherboards('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
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

  it('valida build compatible con socket, RAM y PSU correctos', async () => {
    const prisma = createPrismaMock();
    prisma.product.findMany.mockResolvedValue([
      { id: 'cpu-1', category: 'CPU', cpuSpecs: { socket: 'AM5', tdp: 105 } },
      {
        id: 'board-1',
        category: 'MOTHERBOARD',
        motherboardSpecs: {
          socket: 'AM5',
          memoryType: 'DDR5',
          formFactor: 'ATX',
          m2Slots: 1,
          supportedM2FormFactors: ['2280'],
        },
      },
      { id: 'ram-1', category: 'RAM', ramSpecs: { memoryType: 'DDR5' } },
      {
        id: 'gpu-1',
        category: 'GPU',
        gpuSpecs: { length: 280, gpuPowerWatts: 250 },
      },
      { id: 'psu-1', category: 'PSU', psuSpecs: { wattage: 650 } },
      {
        id: 'case-1',
        category: 'CASE',
        caseSpecs: { formFactor: 'ATX', maxGpuLength: 320 },
      },
      {
        id: 'cooler-1',
        category: 'COOLER',
        coolerSpecs: { compatibleSockets: ['AM5'], tdpCapacity: 150 },
      },
      {
        id: 'storage-1',
        category: 'STORAGE',
        storageSpecs: { type: 'M.2 NVMe', m2FormFactor: '2280' },
      },
    ]);

    const service = new BuilderService(prisma as any);
    const result = await service.validateBuild([
      { productId: 'cpu-1' },
      { productId: 'board-1' },
      { productId: 'ram-1' },
      { productId: 'gpu-1' },
      { productId: 'psu-1' },
      { productId: 'case-1' },
      { productId: 'cooler-1' },
      { productId: 'storage-1' },
    ]);

    expect(result.compatible).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.summary.recommendedPsu).toBeGreaterThan(0);
  });

  it('detecta CPU y motherboard con sockets incompatibles', async () => {
    const prisma = createPrismaMock();
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'cpu-1',
        category: 'CPU',
        cpuSpecs: { socket: 'LGA1700', tdp: 125 },
      },
      {
        id: 'board-1',
        category: 'MOTHERBOARD',
        motherboardSpecs: { socket: 'AM5', memoryType: 'DDR5' },
      },
    ]);

    const service = new BuilderService(prisma as any);
    const result = await service.validateBuild([{ productId: 'cpu-1' }, { productId: 'board-1' }]);

    expect(result.compatible).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CPU_MOTHERBOARD_SOCKET_MISMATCH' }),
      ]),
    );
  });

  it('detecta RAM incompatible con el tipo de memoria de la motherboard', async () => {
    const prisma = createPrismaMock();
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'board-1',
        category: 'MOTHERBOARD',
        motherboardSpecs: { socket: 'AM5', memoryType: 'DDR5' },
      },
      { id: 'ram-1', category: 'RAM', ramSpecs: { memoryType: 'DDR4' } },
    ]);

    const service = new BuilderService(prisma as any);
    const result = await service.validateBuild([{ productId: 'board-1' }, { productId: 'ram-1' }]);

    expect(result.compatible).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RAM_MOTHERBOARD_MEMORY_TYPE_MISMATCH',
        }),
      ]),
    );
  });

  it('detecta PSU insuficiente con margen de seguridad', async () => {
    const prisma = createPrismaMock();
    prisma.product.findMany.mockResolvedValue([
      { id: 'cpu-1', category: 'CPU', cpuSpecs: { socket: 'AM5', tdp: 125 } },
      { id: 'gpu-1', category: 'GPU', gpuSpecs: { gpuPowerWatts: 300 } },
      { id: 'psu-1', category: 'PSU', psuSpecs: { wattage: 400 } },
    ]);

    const service = new BuilderService(prisma as any);
    const result = await service.validateBuild([
      { productId: 'cpu-1' },
      { productId: 'gpu-1' },
      { productId: 'psu-1' },
    ]);

    expect(result.compatible).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'PSU_INSUFFICIENT_WATTAGE' })]),
    );
  });
});
