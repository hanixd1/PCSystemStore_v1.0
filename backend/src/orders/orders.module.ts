import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ProductPricingService } from '../products/services/product-pricing.service';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { BuilderModule } from '../builder/builder.module';

@Module({
  imports: [PrismaModule, IdempotencyModule, BuilderModule],
  controllers: [OrdersController],
  providers: [OrdersService, ProductPricingService],
  exports: [OrdersService],
})
export class OrdersModule {}
