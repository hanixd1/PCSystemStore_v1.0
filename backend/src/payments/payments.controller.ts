import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtUserPayload } from '../auth/auth.constants';
import { Roles } from '../auth/roles.decorator';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & { user: JwtUserPayload };

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Roles('CUSTOMER')
  @Post('payments/simulate')
  async simulate(
    @Body() body: SimulatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.idempotency.run({
      key: idempotencyKey,
      route: '/payments/simulate',
      method: 'POST',
      body,
      userId: request.user.sub,
      successStatusCode: 201,
      handler: () => this.paymentsService.simulate(body, request.user.sub),
    });

    response.status(result.statusCode);
    return result.body;
  }

  @Roles('CUSTOMER')
  @Post('payments/manual')
  async createManual(
    @Body() body: ManualPaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.idempotency.run({
      key: idempotencyKey,
      route: '/payments/manual',
      method: 'POST',
      body,
      userId: request.user.sub,
      successStatusCode: 201,
      handler: () => this.paymentsService.createManual(body, request.user.sub),
    });

    response.status(result.statusCode);
    return result.body;
  }

  @Roles('ADMIN')
  @Get('admin/payments/pending')
  findPendingManual() {
    return this.paymentsService.findPendingManual();
  }

  @Roles('ADMIN')
  @Patch('admin/payments/:id/approve')
  async approveManual(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.idempotency.run({
      key: idempotencyKey,
      route: `/admin/payments/${id}/approve`,
      method: 'PATCH',
      body: { id },
      userId: request.user.sub,
      successStatusCode: 200,
      handler: () => this.paymentsService.approveManual(id, request.user.sub),
    });

    response.status(result.statusCode);
    return result.body;
  }

  @Roles('ADMIN')
  @Patch('admin/payments/:id/reject')
  async rejectManual(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.idempotency.run({
      key: idempotencyKey,
      route: `/admin/payments/${id}/reject`,
      method: 'PATCH',
      body: { id },
      userId: request.user.sub,
      successStatusCode: 200,
      handler: () => this.paymentsService.rejectManual(id, request.user.sub),
    });

    response.status(result.statusCode);
    return result.body;
  }
}
