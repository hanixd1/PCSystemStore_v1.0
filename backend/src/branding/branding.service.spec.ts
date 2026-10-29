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

describe('BrandingService updates', () => {
  const branding = {
    id: 'default-store-branding',
    storeName: 'PCSystemStore',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/pcsystemstore/branding/logo.webp',
    logoAlt: 'PCSystemStore',
  };
  const createService = () => {
    const prisma = {
      storeBranding: {
        findFirst: jest.fn(async () => branding),
        findUnique: jest.fn(async () => branding),
        upsert: jest.fn(async () => branding),
        create: jest.fn(async () => branding),
        update: jest.fn(async ({ data }: any) => ({ ...branding, ...data })),
      },
      homeBanner: {
        findUnique: jest.fn(async () => ({
          id: 'banner-1',
          title: 'Banner',
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/pcsystemstore/banners/a.webp',
          mobileImageUrl: null,
        })),
        delete: jest.fn(async () => undefined),
        count: jest.fn(async () => 0),
      },
    };
    const cloudinary = { deleteImagesByUrl: jest.fn(async () => undefined) };
    const service = new BrandingService(
      prisma as any,
      { log: jest.fn() } as any,
      cloudinary as any,
    );
    return { service, prisma, cloudinary };
  };

  it('cambiar solo el nombre conserva el logo', async () => {
    const { service, prisma } = createService();

    await service.updateBranding({ storeName: 'Nuevo nombre' });

    expect(prisma.storeBranding.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ logoUrl: branding.logoUrl }) }),
    );
  });

  it('un logoUrl vacio quita el logo', async () => {
    const { service, prisma } = createService();

    await service.updateBranding({ logoUrl: '' });

    expect(prisma.storeBranding.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ logoUrl: null }) }),
    );
  });

  it('al borrar un banner solo limpia imagenes de la carpeta de banners', async () => {
    const { service, cloudinary } = createService();

    await service.deleteBanner('11111111-1111-4111-8111-111111111111');

    expect(cloudinary.deleteImagesByUrl).toHaveBeenCalledWith(
      ['https://res.cloudinary.com/demo/image/upload/v1/pcsystemstore/banners/a.webp'],
      'pcsystemstore/banners',
    );
  });
});

describe('BrandingService banner links', () => {
  const service = new BrandingService({} as any, { log: jest.fn() } as any);
  const banner = (linkUrl: string) =>
    ({
      title: 'Banner',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/pcsystemstore/banners/a.webp',
      linkUrl,
    }) as any;

  it.each(['//evil.com', '/\\evil.com', 'javascript:alert(1)', 'data:text/html,x', '/a b'])(
    'rechaza el link %s',
    async (linkUrl) => {
      await expect(service.createBanner(banner(linkUrl))).rejects.toThrow('link destino');
    },
  );
});
