import { BrandingService } from './branding.service';

describe('BrandingService public banners', () => {
  it('only queries active banners inside their publication window', async () => {
    const prisma = {
      homeBanner: {
        findMany: jest.fn(async () => []),
      },
    };
    const service = new BrandingService(prisma as any, { log: jest.fn() } as any);

    await service.getPublicBanners();

    expect(prisma.homeBanner.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: expect.any(Date) } }],
          },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  });
});
