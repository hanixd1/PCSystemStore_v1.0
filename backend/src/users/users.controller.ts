import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtUserPayload } from '../auth/auth.constants';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & { user: JwtUserPayload };

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginUserDto) {
    return this.usersService.login(body.email, body.password);
  }

  @Public()
  @Post('customer-login')
  customerLogin(@Body() body: LoginUserDto) {
    return this.usersService.customerLogin(body.email, body.password);
  }

  @Public()
  @Post('admin-login')
  adminLogin(@Body() body: LoginUserDto) {
    return this.usersService.adminLogin(body.email, body.password);
  }

  @Public()
  @Post('register')
  register(@Body() body: RegisterUserDto) {
    return this.usersService.register(body);
  }

  @Public()
  @Post('google-auth')
  googleAuth(@Body() body: GoogleAuthDto) {
    return this.usersService.loginWithGoogle(body.idToken);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.usersService.forgotPassword(body.email, body.flow ?? 'client');
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(body.token, body.newPassword);
  }

  @Roles('CUSTOMER')
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.usersService.getMe(request.user.sub);
  }

  @Roles('CUSTOMER')
  @Patch('me/profile')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(request.user.sub, body);
  }

  @Roles('CUSTOMER')
  @Patch('me/password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      request.user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Roles('CUSTOMER')
  @Get('me/addresses')
  getAddresses(@Req() request: AuthenticatedRequest) {
    return this.usersService.getAddresses(request.user.sub);
  }

  @Roles('CUSTOMER')
  @Post('me/addresses')
  createAddress(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateAddressDto,
  ) {
    return this.usersService.createAddress(request.user.sub, body);
  }

  @Roles('CUSTOMER')
  @Delete('me/addresses/:id')
  deleteAddress(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deleteAddress(request.user.sub, id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles('ADMIN')
  @Get('audit/logs')
  getLogs() {
    return this.usersService.getAuditLogs();
  }

  @Roles('ADMIN')
  @Patch(':id/toggle-status')
  toggleStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, body);
  }
}
