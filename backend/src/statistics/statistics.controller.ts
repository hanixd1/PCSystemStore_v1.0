import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { JwtUserPayload } from '../auth/auth.constants';
import { StatisticsService } from './statistics.service';
import { UpdateStockAlertStateDto } from './dto/update-stock-alert-state.dto';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

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

  @Get('forecast/overview')
  getForecastOverview(): Promise<unknown> {
    return this.statisticsService.getForecastOverview();
  }

  /** Forecast of one month (YYYY-MM) and, optionally, P(sales >= threshold). */
  @Get('forecast')
  getMonthForecast(
    @Query('month') month?: string,
    @Query('threshold') threshold?: string,
  ): Promise<unknown> {
    if (month !== undefined && !MONTH_PATTERN.test(month)) {
      throw new BadRequestException('El mes debe tener el formato AAAA-MM.');
    }
    const parsedThreshold =
      threshold === undefined || threshold === '' ? undefined : Number(threshold);
    if (
      parsedThreshold !== undefined &&
      (!Number.isFinite(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100000)
    ) {
      throw new BadRequestException('El umbral de unidades no es valido.');
    }
    return this.statisticsService.getMonthForecast(month, parsedThreshold);
  }

  @Get('forecast/research')
  getForecastResearch(): Promise<unknown> {
    return this.statisticsService.getForecastResearch();
  }

  @Post('stock-alerts/action')
  updateStockAlertState(
    @Body() body: UpdateStockAlertStateDto,
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    return this.statisticsService.updateStockAlertState({
      productId: body.productId,
      alertType: body.alertType,
      status: body.action,
      reviewedByUserId: request.user.sub,
      note: body.note,
    });
  }
}
