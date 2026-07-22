import { ForbiddenException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { ManualPaymentProvider, SimulatedPaymentProvider } from './payment-provider.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService pagos manuales', () => {
  const baseOrder = {
    id: 'order-1',
    userId: 'customer-1',
    status: OrderStatus.PENDING_REVIEW,
    total: 500,
    currency: 'PEN',
    items: [
      {
        productId: 'product-1',
        productNameSnapshot: 'Producto QA',
        quantity: 2,
      },
    ],
    payments: [],
  };

  const createService = () => {
    const tx: any = {
      order: {
        findUnique: jest.fn(async () => baseOrder),
        update: jest.fn(async ({ data }) => ({ ...baseOrder, ...data })),
      },
      product: {
        findUnique: jest.fn(async () => ({
          id: 'product-1',
          name: 'Producto QA',
          stock: 5,
        })),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      payment: {
        update: jest.fn(async ({ data }) => ({ id: 'payment-1', ...data })),
        findUnique: jest.fn(async () => ({
          id: 'payment-1',
          status: PaymentStatus.APPROVED,
          order: baseOrder,
        })),
      },
      actionLog: {
        create: jest.fn(async (args) => args),
      },
    };

    const prisma: any = {
      order: {
        findUnique: jest.fn(async () => baseOrder),
      },
      payment: {
        create: jest.fn(async ({ data }) => ({
          id: 'payment-1',
          ...data,
          order: baseOrder,
        })),
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => ({
          id: 'payment-1',
          orderId: 'order-1',
          method: PaymentMethod.YAPE,
          provider: PaymentProvider.MANUAL,
          status: PaymentStatus.PENDING_REVIEW,
        })),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };

    return {
      service: new PaymentsService(
        prisma,
        new SimulatedPaymentProvider(),
        new ManualPaymentProvider(),
      ),
      prisma,
      tx,
    };
  };

  it('PAY-01 pago manual queda PENDING_REVIEW', async () => {
    const { service, prisma } = createService();

    const payment = await service.createManual(
      {
        orderId: 'order-1',
        method: PaymentMethod.YAPE,
        operationCode: '123456',
      },
      'customer-1',
    );

    expect(payment.status).toBe(PaymentStatus.PENDING_REVIEW);
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: PaymentProvider.MANUAL,
          method: PaymentMethod.YAPE,
          operationCode: '123456',
        }),
      }),
    );
  });

  it('PAY-02 no descuenta stock al crear pago manual pendiente', async () => {
    const { service, tx } = createService();

    await service.createManual(
      {
        orderId: 'order-1',
        method: PaymentMethod.PLIN,
        operationCode: '654321',
      },
      'customer-1',
    );

    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('PAY-03/04/05 aprobar pago manual marca pago/orden y descuenta stock', async () => {
    const { service, tx } = createService();

    await service.approveManual('payment-1', 'admin-1');

    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.APPROVED }),
      }),
    );
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: OrderStatus.PAID }),
      }),
    );
    expect(tx.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stock: { decrement: 2 } },
      }),
    );
  });

  it('PAY-06/07 rechazar pago manual no descuenta stock', async () => {
    const { service, tx } = createService();

    await service.rejectManual('payment-1', 'admin-1');

    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: PaymentStatus.REJECTED },
      }),
    );
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: OrderStatus.REJECTED },
      }),
    );
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('cliente no puede pagar orden de otro usuario', async () => {
    const { service, prisma } = createService();
    prisma.order.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      userId: 'other-user',
    });

    await expect(
      service.createManual(
        {
          orderId: 'order-1',
          method: PaymentMethod.YAPE,
          operationCode: '123456',
        },
        'customer-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza Yape/Plin cuando la orden supera S/. 500', async () => {
    const { service, prisma } = createService();
    prisma.order.findUnique.mockResolvedValueOnce({ ...baseOrder, total: 501 });

    await expect(
      service.createManual(
        {
          orderId: 'order-1',
          method: PaymentMethod.YAPE,
          operationCode: '123456',
        },
        'customer-1',
      ),
    ).rejects.toThrow('Yape/Plin no disponible para pedidos mayores a S/. 500.');

    expect(prisma.payment.create).not.toHaveBeenCalled();
  });
});
