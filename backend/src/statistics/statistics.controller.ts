import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { JwtUserPayload } from '../auth/auth.constants';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@Roles('ADMIN')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      module: 'statistics',
    };
  }

  @Get('inventory-dashboard')
  getInventoryDashboard(): Promise<unknown> {
    return this.statisticsService.getInventoryDashboard();
  }

  @Post('stock-alerts/action')
  updateStockAlertState(
    @Body()
    body: {
      productId?: string;
      alertType?: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'PREDICTIVE_RISK';
      action?: 'REVIEWED' | 'DISMISSED';
      note?: string;
    },
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    return this.statisticsService.updateStockAlertState({
      productId: body.productId ?? '',
      alertType: body.alertType as 'OUT_OF_STOCK' | 'LOW_STOCK' | 'PREDICTIVE_RISK',
      status: body.action as 'REVIEWED' | 'DISMISSED',
      reviewedByUserId: request.user.sub,
      note: body.note,
    });
  }
}
