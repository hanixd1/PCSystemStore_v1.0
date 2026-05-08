import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ProductPricingService } from '../products/services/product-pricing.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, ProductPricingService],
  exports: [OrdersService],
})
export class OrdersModule {}
