import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtUserPayload } from '../auth/auth.constants';
import { Roles } from '../auth/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & { user: JwtUserPayload };

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles('CUSTOMER')
  @Post('orders')
  create(@Body() body: CreateOrderDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.create(body, request.user.sub);
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
