import { Controller, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.usersService.login(body.email, body.password);
  }

  // NUEVA RUTA: Solicitar
  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.usersService.forgotPassword(body.email);
  }

  // NUEVA RUTA: Resetear
  @Post('reset-password')
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.usersService.resetPassword(body.token, body.newPassword);
  }
}