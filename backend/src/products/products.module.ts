import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuditModule } from '../audit/audit.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ProductPricingService } from './services/product-pricing.service';
import { ProductImportController } from './import/product-import.controller';
import { ProductImportService } from './import/product-import.service';

@Module({
  imports: [AuditModule, UploadsModule],
  controllers: [ProductImportController, ProductsController],
  providers: [ProductsService, ProductPricingService, ProductImportService],
  exports: [ProductPricingService],
})
export class ProductsModule {}
