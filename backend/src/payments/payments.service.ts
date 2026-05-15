import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { ManualPaymentProvider, SimulatedPaymentProvider } from './payment-provider.service';

const DEFAULT_COMMISSION_RATE = 0.04;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly simulatedProvider: SimulatedPaymentProvider,
    private readonly manualProvider: ManualPaymentProvider,
  ) {}

  private readonly paymentInclude = {
    order: {
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } },
      },
    },
  } satisfies Prisma.PaymentInclude;

  private getCommissionRate() {
    const configured = Number(process.env.PAYMENT_COMMISSION_RATE);
    return Number.isFinite(configured) && configured >= 0
      ? configured
      : DEFAULT_COMMISSION_RATE;
  }

  private async getOrderForPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('No puedes pagar una orden de otro usuario');
    }

    const closedStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.REJECTED,
      OrderStatus.CANCELLED,
    ];
    if (closedStatuses.includes(order.status)) {
      throw new BadRequestException('La orden ya no acepta pagos');
    }

    return order;
  }

  private async markOrderPaidWithStockDiscount(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status === OrderStatus.PAID) {
      return [];
    }

    const stockChanges: Array<{
      productId: string;
      productName: string;
      quantity: number;
      before: number;
      after: number;
    }> = [];

    for (const item of order.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, stock: true },
      });

      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${item.productNameSnapshot}`,
        );
      }

      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException(
          `Stock insuficiente para ${item.productNameSnapshot}`,
        );
      }

      stockChanges.push({
        productId: item.productId,
        productName: item.productNameSnapshot,
        quantity: item.quantity,
        before: product.stock,
        after: product.stock - item.quantity,
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      },
    });

    return stockChanges;
  }

  async simulate(data: SimulatePaymentDto, userId: string) {
    const order = await this.getOrderForPayment(data.orderId, userId);
    const amount = Number(order.total);
    const commissionRate = this.getCommissionRate();
    const providerResult = this.simulatedProvider.createPayment({
      method: data.method as PaymentMethod,
      amount,
      simulateResult: data.simulateResult,
    });

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: providerResult.provider,
          method: data.method,
          status: providerResult.status,
          amount,
          currency: order.currency,
          commissionRate,
          commissionAmount: amount * commissionRate,
          providerTransactionId: providerResult.providerTransactionId,
          approvalCode: providerResult.approvalCode,
          customerNote: data.installments
            ? `Cuotas simuladas: ${data.installments}`
            : undefined,
          paidAt:
            providerResult.status === PaymentStatus.APPROVED
              ? new Date()
              : undefined,
        },
      });

      if (providerResult.status === PaymentStatus.APPROVED) {
        const stockChanges = await this.markOrderPaidWithStockDiscount(tx, order.id);
        for (const change of stockChanges) {
          await tx.actionLog.create({
            data: {
              userId,
              action: 'STOCK_DECREASED_BY_SALE',
              module: 'SALES',
              entity: 'PRODUCT',
              entityType: 'PRODUCT',
              entityId: change.productId,
              entityName: change.productName,
              fieldName: 'stock',
              oldValue: String(change.before),
              newValue: String(change.after),
              stockBefore: change.before,
              stockAfter: change.after,
              details: `Producto vendido: ${change.productName}. Cantidad: ${change.quantity}. Stock reducido de ${change.before} a ${change.after}. Pedido: ${order.id}. Metodo: ${data.method}.`,
              metadata: { orderId: order.id, method: data.method, quantity: change.quantity },
            },
          });
        }
      } else {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.REJECTED },
        });
      }

      return tx.payment.findUnique({
        where: { id: payment.id },
        include: this.paymentInclude,
      });
    });
  }

  async createManual(data: ManualPaymentDto, userId: string) {
    const order = await this.getOrderForPayment(data.orderId, userId);
    const amount = Number(order.total);
    const commissionRate = this.getCommissionRate();
    const providerResult = this.manualProvider.createPayment();

    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: providerResult.provider,
        method: data.method,
        status: providerResult.status,
        amount,
        currency: order.currency,
        commissionRate,
        commissionAmount: amount * commissionRate,
        operationCode: data.operationCode.trim(),
        customerNote: data.customerNote,
      },
      include: this.paymentInclude,
    });
  }

  findPendingManual() {
    return this.prisma.payment.findMany({
      where: {
        provider: PaymentProvider.MANUAL,
        status: PaymentStatus.PENDING_REVIEW,
      },
      orderBy: { createdAt: 'desc' },
      include: this.paymentInclude,
    });
  }

  async approveManual(id: string, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status === PaymentStatus.APPROVED) {
      return this.prisma.payment.findUnique({
        where: { id },
        include: this.paymentInclude,
      });
    }

    if (payment.status !== PaymentStatus.PENDING_REVIEW) {
      throw new BadRequestException('El pago no esta pendiente de revision');
    }

    return this.prisma.$transaction(async (tx) => {
      const stockChanges = await this.markOrderPaidWithStockDiscount(tx, payment.orderId);
      await tx.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.APPROVED,
          paidAt: new Date(),
          approvalCode: `MAN-${Math.floor(100000 + Math.random() * 900000)}`,
        },
      });

      for (const change of stockChanges) {
        await tx.actionLog.create({
          data: {
            userId: actorId,
            action: 'PAYMENT_APPROVED_STOCK_DECREASE',
            module: 'PAYMENTS',
            entity: 'PRODUCT',
            entityType: 'PRODUCT',
            entityId: change.productId,
            entityName: change.productName,
            fieldName: 'stock',
            oldValue: String(change.before),
            newValue: String(change.after),
            stockBefore: change.before,
            stockAfter: change.after,
            details: `Pago manual aprobado. Se desconto stock de ${change.productName} de ${change.before} a ${change.after}. Pago: ${payment.id}.`,
            metadata: { paymentId: payment.id, orderId: payment.orderId, method: payment.method, quantity: change.quantity },
          },
        });
      }

      return tx.payment.findUnique({
        where: { id },
        include: this.paymentInclude,
      });
    });
  }

  async rejectManual(id: string, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status === PaymentStatus.REJECTED) {
      return this.prisma.payment.findUnique({
        where: { id },
        include: this.paymentInclude,
      });
    }

    if (payment.status !== PaymentStatus.PENDING_REVIEW) {
      throw new BadRequestException('El pago no esta pendiente de revision');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.REJECTED },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.REJECTED },
      });

      await tx.actionLog.create({
        data: {
          userId: actorId,
          action: 'PAYMENT_REJECTED_NO_STOCK_CHANGE',
          module: 'PAYMENTS',
          entity: 'PAYMENT',
          entityType: 'PAYMENT',
          entityId: payment.id,
          entityName: String(payment.method),
          details: `Pago manual rechazado. No se modifico stock. Pago: ${payment.id}.`,
          metadata: { paymentId: payment.id, orderId: payment.orderId, method: payment.method },
        },
      });

      return tx.payment.findUnique({
        where: { id },
        include: this.paymentInclude,
      });
    });
  }
}
