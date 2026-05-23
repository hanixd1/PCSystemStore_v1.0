import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProductPricingService } from '../products/services/product-pricing.service';
import {
  isManualWalletPayment,
  MANUAL_WALLET_PAYMENT_LIMIT,
  MANUAL_WALLET_PAYMENT_LIMIT_MESSAGE,
} from '../payments/payment.constants';
import { assertPaymentsEnabled } from '../payments/payment.config';
import { BuilderService } from '../builder/builder.service';

const IGV_RATE_INCLUDED = 18 / 118;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ProductPricingService,
    private readonly builderService: BuilderService,
  ) {}

  private readonly orderInclude = {
    items: true,
    payments: true,
    user: { select: { id: true, name: true, email: true } },
  } satisfies Prisma.OrderInclude;

  async create(data: CreateOrderDto, userId: string) {
    assertPaymentsEnabled();
    await this.assertCustomerCanCheckout(userId);

    const normalizedItems = data.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }));
    const ids = normalizedItems.map((item) => item.productId);
    const uniqueIds = new Set(ids);

    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException('No repitas productos en la orden');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
    });

    if (products.length !== ids.length) {
      throw new BadRequestException('Uno o mas productos no existen');
    }

    const productById = new Map(products.map((product) => [product.id, product]));

    for (const item of normalizedItems) {
      const product = productById.get(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(`Stock insuficiente para ${product?.name || 'un producto'}`);
      }
    }

    if (data.source === 'builder') {
      const validation = await this.builderService.validateBuild(
        normalizedItems.map((item) => ({ productId: item.productId })),
      );

      if (!validation.compatible) {
        throw new BadRequestException({
          message: 'Configuracion de PC incompatible.',
          errors: validation.errors,
          warnings: validation.warnings,
          summary: validation.summary,
        });
      }
    }

    const total = normalizedItems.reduce((sum, item) => {
      const product = productById.get(item.productId)!;
      return sum + this.pricing.getEffectivePrice(product) * item.quantity;
    }, 0);

    if (isManualWalletPayment(data.method) && total > MANUAL_WALLET_PAYMENT_LIMIT) {
      throw new BadRequestException(MANUAL_WALLET_PAYMENT_LIMIT_MESSAGE);
    }

    const igv = total * IGV_RATE_INCLUDED;
    const subtotal = total - igv;
    const status = isManualWalletPayment(data.method) ? 'PENDING_REVIEW' : 'PENDING_PAYMENT';

    return this.prisma.order.create({
      data: {
        userId,
        status,
        subtotal,
        igv,
        total,
        currency: 'PEN',
        items: {
          create: normalizedItems.map((item) => {
            const product = productById.get(item.productId)!;
            const unitPrice = this.pricing.getEffectivePrice(product);
            return {
              productId: product.id,
              productNameSnapshot: product.name,
              unitPriceSnapshot: unitPrice,
              quantity: item.quantity,
              subtotal: unitPrice * item.quantity,
            };
          }),
        },
      },
      include: this.orderInclude,
    });
  }

  async findOne(id: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (userId && order.userId !== userId) {
      throw new ForbiddenException('No puedes acceder a esta orden');
    }

    return order;
  }

  findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: this.orderInclude,
    });
  }

  private async assertCustomerCanCheckout(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        documentType: true,
        documentNumber: true,
        mobilePhone: true,
      },
    });

    if (
      !user?.emailVerified ||
      !user.documentType?.trim() ||
      !user.documentNumber?.trim() ||
      !user.mobilePhone?.trim()
    ) {
      throw new BadRequestException({
        code: 'PROFILE_INCOMPLETE',
        message: 'Completa tu tipo de documento, número de documento y celular antes de continuar.',
      });
    }
  }
}
