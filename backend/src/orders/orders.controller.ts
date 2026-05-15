import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtUserPayload } from '../auth/auth.constants';
import { Roles } from '../auth/roles.decorator';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & { user: JwtUserPayload };

@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Roles('CUSTOMER')
  @Post('orders')
  async create(
    @Body() body: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.idempotency.run({
      key: idempotencyKey,
      route: '/orders',
      method: 'POST',
      body,
      userId: request.user.sub,
      successStatusCode: 201,
      handler: () => this.ordersService.create(body, request.user.sub),
    });

    response.status(result.statusCode);
    return result.body;
  }

  @Roles('CUSTOMER')
  @Get('orders/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.ordersService.findOne(id, request.user.sub);
  }

  @Roles('CUSTOMER')
  @Get('users/me/orders')
  findMyOrders(@Req() request: AuthenticatedRequest) {
    return this.ordersService.findByUser(request.user.sub);
  }

  @Roles('ADMIN', 'EDITOR')
  @Get('users/:id/orders')
  findByUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findByUser(id);
  }
}
