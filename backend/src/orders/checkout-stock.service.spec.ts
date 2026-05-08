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

    return {
      service: new OrdersService(prisma as any, new ProductPricingService()),
      prisma,
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
});
