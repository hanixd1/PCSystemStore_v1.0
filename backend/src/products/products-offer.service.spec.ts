import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductPricingService } from './services/product-pricing.service';

const baseProduct: any = {
  id: 'product-1',
  name: 'AMD Ryzen 5 7600X',
  description: 'Procesador potente para pruebas QA',
  price: 1250,
  salePrice: 1000,
  isOnSale: true,
  stock: 12,
  category: 'CPU',
  images: ['image-1.png'],
  cpuSpecs: null,
  motherboardSpecs: null,
  coolerSpecs: null,
  storageSpecs: null,
  laptopSpecs: null,
  desktopSpecs: null,
  monitorSpecs: null,
  keyboardSpecs: null,
  mouseSpecs: null,
  mousepadSpecs: null,
  chairSpecs: null,
  gamingDeskSpecs: null,
};

describe('ProductsService ofertas API/service', () => {
  const createService = (current = baseProduct) => {
    const prisma = {
      product: {
        findUnique: jest.fn(async () => current),
        update: jest.fn(async ({ data }) => ({ ...current, ...data })),
        create: jest.fn(async ({ data }) => ({ id: 'created-1', ...data })),
      },
    };
    const audit = { log: jest.fn(async (args) => args) };
    const pricing = new ProductPricingService();

    return {
      service: new ProductsService(prisma as any, audit as any, pricing),
      prisma,
      audit,
    };
  };

  it('crear producto ignora oferta recibida y fuerza isOnSale=false salePrice=null', async () => {
    const { service, prisma } = createService();

    await service.create(
      {
        name: 'QA Producto Creacion Sin Oferta',
        description: 'Producto QA creado desde flujo de agregar sin permitir oferta inicial.',
        price: 1000,
        isOnSale: true,
        salePrice: 0,
        stock: 5,
        category: 'CPU',
        image: 'https://example.com/product.png',
        cpuBrand: 'AMD',
        socket: 'AM5',
        cores: 6,
        threads: 12,
        frequency: '4.7',
        tdp: 105,
        integratedGraphics: true,
        includesCooler: false,
      } as any,
      'admin-1',
    );

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isOnSale: false,
          salePrice: null,
        }),
      }),
    );
  });

  it('PROD-02/03 permite editar stock y precio sin exigir salePrice si la oferta no cambia', async () => {
    const current = { ...baseProduct, isOnSale: false, salePrice: null };
    const { service, prisma } = createService(current);

    await service.update('product-1', { stock: 8, price: 1300 } as any, 'admin-1');

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stock: 8, price: 1300 }),
      }),
    );
  });

  it('PROD-04 activa oferta con salePrice valido', async () => {
    const current = { ...baseProduct, isOnSale: false, salePrice: null };
    const { service, prisma } = createService(current);

    await service.update('product-1', { isOnSale: true, salePrice: 999 } as any, 'admin-1');

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isOnSale: true, salePrice: 999 }),
      }),
    );
  });

  it('PROD-05 rechaza oferta con salePrice mayor o igual al precio', async () => {
    const { service } = createService();

    await expect(
      service.update('product-1', { isOnSale: true, salePrice: 1250 } as any, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PROD-06 desactiva oferta guardando isOnSale=false y salePrice=null', async () => {
    const { service, prisma } = createService();

    await service.update('product-1', { isOnSale: false } as any, 'admin-1');

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isOnSale: false, salePrice: null }),
      }),
    );
  });

  it('PROD-07 editar producto sin oferta no exige salePrice', async () => {
    const current = { ...baseProduct, isOnSale: false, salePrice: null };
    const { service } = createService(current);

    await expect(
      service.update('product-1', { description: 'Descripcion actualizada para QA sin oferta' } as any, 'admin-1'),
    ).resolves.toEqual(expect.objectContaining({ description: 'Descripcion actualizada para QA sin oferta' }));
  });
});
