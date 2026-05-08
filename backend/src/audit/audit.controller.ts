import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@Controller('admin/audit')
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('security')
  getSecurity(@Query('limit') limit?: string) {
    return this.auditService.findByScope('security', Number(limit) || 100);
  }

  @Get('products')
  getProducts(@Query('limit') limit?: string) {
    return this.auditService.findByScope('products', Number(limit) || 100);
  }
}
