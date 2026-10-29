import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { ManualPaymentProvider, SimulatedPaymentProvider } from './payment-provider.service';
import { PaymentsService } from './payments.service';

/**
 * In-memory store with the semantics the service relies on: updateMany only touches rows that
 * still match its where clause (compare-and-set), as PostgreSQL does under row locks.
 */
function createStore() {
  const order: any = {
    id: 'order-1',
    userId: 'customer-1',
    status: OrderStatus.PENDING_REVIEW,
    total: 500,
    currency: 'PEN',
    items: [{ productId: 'product-1', productNameSnapshot: 'Producto QA', quantity: 2 }],
    payments: [],
  };
  const product = { id: 'product-1', name: 'Producto QA', stock: 5 };
  const payments: any[] = [];

  const matchesStatus = (status: string, filter: any) =>
    filter === undefined ||
    (typeof filter === 'string' ? status === filter : filter.in.includes(status));

  const tx: any = {
    $queryRaw: jest.fn(async () => []),
    order: {
      findUnique: jest.fn(async () => ({ ...order })),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.id !== order.id || !matchesStatus(order.status, where.status)) {
          return { count: 0 };
        }
        Object.assign(order, data);
        return { count: 1 };
      }),
    },
    product: {
      findUnique: jest.fn(async () => ({ ...product })),
      updateMany: jest.fn(async ({ data }: any) => {
        product.stock -= data.stock.decrement;
        return { count: 1 };
      }),
    },
    payment: {
      count: jest.fn(
        async ({ where }: any) =>
          payments.filter((p) => p.orderId === where.orderId && p.status === where.status).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const payment = { id: `payment-${payments.length + 1}`, ...data };
        payments.push(payment);
        return { ...payment, order };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const payment = payments.find((p) => p.id === where.id);
        if (!payment || !matchesStatus(payment.status, where.status)) {
          return { count: 0 };
        }
        Object.assign(payment, data);
        return { count: 1 };
      }),
      findUnique: jest.fn(async ({ where }: any) => ({
        ...payments.find((p) => p.id === where.id),
        order,
      })),
    },
    actionLog: { create: jest.fn(async (args: unknown) => args) },
  };

  const prisma: any = {
    order: { findUnique: jest.fn(async () => ({ ...order })) },
    payment: {
      findUnique: jest.fn(async ({ where }: any) => {
        const payment = payments.find((p) => p.id === where.id);
        return payment ? { ...payment } : null;
      }),
      findMany: jest.fn(async () => payments),
    },
    $transaction: jest.fn(async (callback: (client: any) => unknown) => callback(tx)),
  };

  const service = new PaymentsService(
    prisma,
    new SimulatedPaymentProvider(),
    new ManualPaymentProvider(),
  );
  const addManualPayment = (status: PaymentStatus = PaymentStatus.PENDING_REVIEW) => {
    const payment = {
      id: `payment-${payments.length + 1}`,
      orderId: order.id,
      method: PaymentMethod.YAPE,
      provider: PaymentProvider.MANUAL,
      amount: 500,
      status,
    };
    payments.push(payment);
    return payment;
  };

  return { service, prisma, tx, order, product, payments, addManualPayment };
}

const manualPayment = {
  orderId: 'order-1',
  method: PaymentMethod.YAPE,
  operationCode: '123456',
};

describe('PaymentsService pagos manuales', () => {
  const original = { ...process.env };
  beforeAll(() => {
    process.env.PAYMENTS_ENABLED = 'true';
  });
  afterAll(() => {
    process.env = original;
  });

  it('PAY-01 pago manual queda PENDING_REVIEW', async () => {
    const { service, tx } = createStore();

    const payment = await service.createManual(manualPayment, 'customer-1');

    expect(payment.status).toBe(PaymentStatus.PENDING_REVIEW);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.payment.create).toHaveBeenCalledWith(
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
    const { service, tx } = createStore();

    await service.createManual({ ...manualPayment, method: PaymentMethod.PLIN }, 'customer-1');

    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('no acepta un segundo comprobante mientras otro sigue en revision', async () => {
    const { service, addManualPayment } = createStore();
    addManualPayment();

    await expect(service.createManual(manualPayment, 'customer-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('PAY-03/04/05 aprobar pago manual marca pago/orden y descuenta stock', async () => {
    const { service, order, product, payments, addManualPayment } = createStore();
    const payment = addManualPayment();

    await service.approveManual(payment.id, 'admin-1');

    expect(payments[0].status).toBe(PaymentStatus.APPROVED);
    expect(order.status).toBe(OrderStatus.PAID);
    expect(product.stock).toBe(3);
  });

  it('una orden ya pagada no se cobra ni descuenta stock dos veces', async () => {
    const { service, order, product, addManualPayment } = createStore();
    const first = addManualPayment();
    const duplicate = addManualPayment();

    await service.approveManual(first.id, 'admin-1');
    await expect(service.approveManual(duplicate.id, 'admin-1')).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(order.status).toBe(OrderStatus.PAID);
    expect(product.stock).toBe(3);
  });

  it('PAY-06/07 rechazar pago manual no descuenta stock y cierra la orden pendiente', async () => {
    const { service, order, tx, payments, addManualPayment } = createStore();
    const payment = addManualPayment();

    await service.rejectManual(payment.id, 'admin-1');

    expect(payments[0].status).toBe(PaymentStatus.REJECTED);
    expect(order.status).toBe(OrderStatus.REJECTED);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('rechazar un comprobante duplicado no revierte una orden ya pagada', async () => {
    const { service, order, product, payments, addManualPayment } = createStore();
    const first = addManualPayment();
    const duplicate = addManualPayment();

    await service.approveManual(first.id, 'admin-1');
    await service.rejectManual(duplicate.id, 'admin-1');

    expect(payments[1].status).toBe(PaymentStatus.REJECTED);
    expect(order.status).toBe(OrderStatus.PAID);
    expect(product.stock).toBe(3);
  });

  it('dos revisiones simultaneas del mismo pago: solo una gana', async () => {
    const { service, prisma, payments, addManualPayment } = createStore();
    const payment = addManualPayment();
    // Both requests read the payment as PENDING_REVIEW before either commits.
    const stale = { ...payment };
    prisma.payment.findUnique.mockResolvedValue(stale);

    await service.approveManual(payment.id, 'admin-1');
    await expect(service.rejectManual(payment.id, 'admin-2')).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(payments[0].status).toBe(PaymentStatus.APPROVED);
  });

  it('dos pagos simulados aprobados con distinta Idempotency-Key: el segundo falla', async () => {
    const { service, prisma, order, product } = createStore();
    order.status = OrderStatus.PENDING_PAYMENT;
    // The second request read the order before the first one committed.
    const stale = { ...order };
    prisma.order.findUnique.mockResolvedValue(stale);
    const simulate = {
      orderId: 'order-1',
      method: PaymentMethod.CARD_CREDIT,
      simulateResult: 'APPROVED',
    } as any;
    process.env.PAYMENT_SIMULATION_ENABLED = 'true';

    await service.simulate(simulate, 'customer-1');
    await expect(service.simulate(simulate, 'customer-1')).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(product.stock).toBe(3);
  });

  it('cliente no puede pagar orden de otro usuario', async () => {
    const { service, prisma, order } = createStore();
    prisma.order.findUnique.mockResolvedValueOnce({ ...order, userId: 'other-user' });

    await expect(service.createManual(manualPayment, 'customer-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza Yape/Plin cuando la orden supera S/. 500', async () => {
    const { service, prisma, tx, order } = createStore();
    prisma.order.findUnique.mockResolvedValueOnce({ ...order, total: 501 });

    await expect(service.createManual(manualPayment, 'customer-1')).rejects.toThrow(
      'Yape/Plin no disponible para pedidos mayores a S/. 500.',
    );

    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});
