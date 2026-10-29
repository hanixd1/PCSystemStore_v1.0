import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { UploadsModule } from '../uploads/uploads.module';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';

@Module({
  imports: [PrismaModule, AuditModule, UploadsModule],
  controllers: [BrandingController],
  providers: [BrandingService],
})
export class BrandingModule {}
