import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuditModule } from '../audit/audit.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ProductPricingService } from './services/product-pricing.service';
import { ProductPayloadService } from './services/product-payload.service';
import { ProductSpecsService } from './services/product-specs.service';
import { ProductValidationService } from './services/product-validation.service';
import { ProductImportController } from './import/product-import.controller';
import { ProductImportService } from './import/product-import.service';
import { ProductTemplateService } from './import/product-template.service';

@Module({
  imports: [AuditModule, UploadsModule],
  controllers: [ProductImportController, ProductsController],
  providers: [
    ProductsService,
    ProductPricingService,
    ProductPayloadService,
    ProductValidationService,
    ProductSpecsService,
    ProductImportService,
    ProductTemplateService,
  ],
  exports: [ProductPricingService],
})
export class ProductsModule {}
