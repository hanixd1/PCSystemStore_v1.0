import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@Roles('ADMIN', 'EDITOR')
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
}
