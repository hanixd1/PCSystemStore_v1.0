import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtUserPayload } from '../auth/auth.constants';
import { Roles } from '../auth/roles.decorator';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & { user: JwtUserPayload };

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('CUSTOMER')
  @Post('payments/simulate')
  simulate(@Body() body: SimulatePaymentDto, @Req() request: AuthenticatedRequest) {
    return this.paymentsService.simulate(body, request.user.sub);
  }

  @Roles('CUSTOMER')
  @Post('payments/manual')
  createManual(@Body() body: ManualPaymentDto, @Req() request: AuthenticatedRequest) {
    return this.paymentsService.createManual(body, request.user.sub);
  }

  @Roles('ADMIN')
  @Get('admin/payments/pending')
  findPendingManual() {
    return this.paymentsService.findPendingManual();
  }

  @Roles('ADMIN')
  @Patch('admin/payments/:id/approve')
  approveManual(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.paymentsService.approveManual(id, request.user.sub);
  }

  @Roles('ADMIN')
  @Patch('admin/payments/:id/reject')
  rejectManual(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.paymentsService.rejectManual(id, request.user.sub);
  }
}
