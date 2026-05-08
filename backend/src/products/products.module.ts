import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuditModule } from '../audit/audit.module';
import { ProductPricingService } from './services/product-pricing.service';

@Module({
  imports: [AuditModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductPricingService],
  exports: [ProductPricingService],
})
export class ProductsModule {}
