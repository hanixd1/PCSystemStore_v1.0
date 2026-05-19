import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { OrdersService } from './orders.service';
import { ProductPricingService } from '../products/services/product-pricing.service';

describe('OrdersService checkout/stock', () => {
  const createService = (products: any[]) => {
    const prisma = {
      product: {
        findMany: jest.fn(async () => products),
      },
      order: {
        create: jest.fn(async ({ data }) => ({
          id: 'order-1',
          userId: data.userId,
          status: data.status,
          subtotal: data.subtotal,
          igv: data.igv,
          total: data.total,
          currency: data.currency,
          items: data.items.create,
          payments: [],
        })),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const builderService: any = {
      validateBuild: jest.fn(async () => ({
        compatible: true,
        errors: [],
        warnings: [],
        summary: { estimatedPower: 0, recommendedPsu: 0 },
      })),
    };

    return {
      service: new OrdersService(prisma as any, new ProductPricingService(), builderService as any),
      prisma,
      builderService,
    };
  };

  it('STOCK-01 producto con stock 0 no permite crear orden', async () => {
    const { service } = createService([
      { id: 'product-1', name: 'Producto sin stock', price: 100, stock: 0 },
    ]);

    await expect(
      service.create(
        { method: PaymentMethod.CARD_CREDIT, items: [{ productId: 'product-1', quantity: 1 }] },
        'customer-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('STOCK-02 producto con stock disponible permite crear orden', async () => {
    const { service } = createService([
      { id: 'product-1', name: 'Producto con stock', price: 100, stock: 3 },
    ]);

    const order = await service.create(
      { method: PaymentMethod.CARD_CREDIT, items: [{ productId: 'product-1', quantity: 2 }] },
      'customer-1',
    );

    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.total).toBe(200);
  });

  it('STOCK-05 cantidad mayor al stock se bloquea', async () => {
    const { service } = createService([
      { id: 'product-1', name: 'Producto con stock limitado', price: 100, stock: 1 },
    ]);

    await expect(
      service.create(
        { method: PaymentMethod.CARD_CREDIT, items: [{ productId: 'product-1', quantity: 2 }] },
        'customer-1',
      ),
    ).rejects.toThrow('Stock insuficiente');
  });

  it('STOCK-06/08 guarda snapshot con salePrice cuando la oferta esta activa', async () => {
    const { service } = createService([
      {
        id: 'product-1',
        name: 'Producto en oferta',
        price: 1000,
        isOnSale: true,
        salePrice: 800,
        stock: 3,
      },
    ]);

    const order = await service.create(
      { method: PaymentMethod.CARD_CREDIT, items: [{ productId: 'product-1', quantity: 1 }] },
      'customer-1',
    );

    expect(order.items[0].unitPriceSnapshot).toBe(800);
    expect(order.items[0].subtotal).toBe(800);
  });

  it('STOCK-07/08 guarda snapshot con precio normal si no hay oferta', async () => {
    const { service } = createService([
      {
        id: 'product-1',
        name: 'Producto sin oferta',
        price: 1000,
        isOnSale: false,
        salePrice: 800,
        stock: 3,
      },
    ]);

    const order = await service.create(
      { method: PaymentMethod.CARD_CREDIT, items: [{ productId: 'product-1', quantity: 1 }] },
      'customer-1',
    );

    expect(order.items[0].unitPriceSnapshot).toBe(1000);
  });

  it('permite Yape/Plin hasta S/. 500', async () => {
    const { service } = createService([
      { id: 'product-1', name: 'Producto limite', price: 500, stock: 3 },
    ]);

    const order = await service.create(
      { method: PaymentMethod.YAPE, items: [{ productId: 'product-1', quantity: 1 }] },
      'customer-1',
    );

    expect(order.status).toBe('PENDING_REVIEW');
    expect(order.total).toBe(500);
  });

  it('rechaza Yape/Plin sobre S/. 500', async () => {
    const { service, prisma } = createService([
      { id: 'product-1', name: 'Producto sobre limite', price: 501, stock: 3 },
    ]);

    await expect(
      service.create(
        { method: PaymentMethod.PLIN, items: [{ productId: 'product-1', quantity: 1 }] },
        'customer-1',
      ),
    ).rejects.toThrow('Yape/Plin no disponible para pedidos mayores a S/. 500.');

    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('rechaza orden builder incompatible antes de crear la orden', async () => {
    const { service, prisma, builderService } = createService([
      { id: 'cpu-1', name: 'CPU', price: 300, stock: 1 },
      { id: 'board-1', name: 'Motherboard', price: 300, stock: 1 },
    ]);
    builderService.validateBuild.mockResolvedValueOnce({
      compatible: false,
      errors: [
        {
          code: 'CPU_MOTHERBOARD_SOCKET_MISMATCH',
          message: 'Socket incompatible',
          products: ['cpu-1', 'board-1'],
        },
      ],
      warnings: [],
      summary: { estimatedPower: 0, recommendedPsu: 0 },
    });

    await expect(
      service.create(
        {
          method: PaymentMethod.CARD_CREDIT,
          source: 'builder',
          items: [
            { productId: 'cpu-1', quantity: 1 },
            { productId: 'board-1', quantity: 1 },
          ],
        },
        'customer-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(builderService.validateBuild).toHaveBeenCalledWith([
      { productId: 'cpu-1' },
      { productId: 'board-1' },
    ]);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
