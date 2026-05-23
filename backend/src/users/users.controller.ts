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
  Res,
} from '@nestjs/common';
import type { CookieOptions } from 'express';
import type * as express from 'express';
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

type AuthenticatedRequest = express.Request & { user: JwtUserPayload };
type SessionScope = 'customer' | 'admin';

const CUSTOMER_SESSION_COOKIE = 'pcs_customer_session';
const ADMIN_SESSION_COOKIE = 'pcs_admin_session';
const CUSTOMER_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const ADMIN_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 3;

function getSessionCookieName(scope: SessionScope) {
  return scope === 'admin' ? ADMIN_SESSION_COOKIE : CUSTOMER_SESSION_COOKIE;
}

function getSessionCookieOptions(scope: SessionScope): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAgeMs = scope === 'admin' ? ADMIN_SESSION_MAX_AGE_MS : CUSTOMER_SESSION_MAX_AGE_MS;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

function getClearSessionCookieOptions(scope: SessionScope): CookieOptions {
  const { maxAge, ...options } = getSessionCookieOptions(scope);
  return options;
}

function setSessionCookie(response: express.Response, scope: SessionScope, token: string) {
  response.cookie(getSessionCookieName(scope), token, getSessionCookieOptions(scope));
}

function clearSessionCookie(response: express.Response, scope: SessionScope) {
  response.clearCookie(getSessionCookieName(scope), getClearSessionCookieOptions(scope));
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: LoginUserDto,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.customerLogin(body.email, body.password, request);
    setSessionCookie(response, 'customer', session.token);
    return session;
  }

  @Public()
  @Post('customer-login')
  async customerLogin(
    @Body() body: LoginUserDto,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.customerLogin(body.email, body.password, request);
    setSessionCookie(response, 'customer', session.token);
    return session;
  }

  @Public()
  @Post('admin-login')
  async adminLogin(
    @Body() body: LoginUserDto,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.adminLogin(body.email, body.password, request);
    setSessionCookie(response, 'admin', session.token);
    return session;
  }

  @Public()
  @Post('register')
  register(@Body() body: RegisterUserDto) {
    return this.usersService.register(body);
  }

  @Public()
  @Post('google-auth')
  async googleAuth(
    @Body() body: GoogleAuthDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.loginWithGoogle(body.idToken);
    setSessionCookie(response, 'customer', session.token);
    return session;
  }

  @Post('customer-logout')
  @Roles('CUSTOMER')
  async customerLogout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    clearSessionCookie(response, 'customer');
    await this.usersService.recordLogout(request.user.sub, 'CUSTOMER_LOGOUT');
    return { message: 'Sesion de cliente cerrada' };
  }

  @Post('admin-logout')
  @Roles('ADMIN', 'EDITOR', 'EMPLOYEE')
  async adminLogout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    clearSessionCookie(response, 'admin');
    await this.usersService.recordLogout(request.user.sub, 'ADMIN_LOGOUT');
    return { message: 'Sesion administrativa cerrada' };
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

  @Roles('ADMIN', 'EDITOR', 'EMPLOYEE')
  @Get('admin-me')
  getAdminMe(@Req() request: AuthenticatedRequest) {
    return this.usersService.getMe(request.user.sub);
  }

  @Roles('CUSTOMER')
  @Patch('me/profile')
  updateProfile(@Req() request: AuthenticatedRequest, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(request.user.sub, body);
  }

  @Roles('CUSTOMER')
  @Patch('me/password')
  changePassword(@Req() request: AuthenticatedRequest, @Body() body: ChangePasswordDto) {
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
  createAddress(@Req() request: AuthenticatedRequest, @Body() body: CreateAddressDto) {
    return this.usersService.createAddress(request.user.sub, body);
  }

  @Roles('CUSTOMER')
  @Delete('me/addresses/:id')
  deleteAddress(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deleteAddress(request.user.sub, id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Roles('ADMIN')
  @Get('staff')
  findStaff() {
    return this.usersService.findStaffUsers();
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
  updateUser(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateUserDto) {
    return this.usersService.updateUser(id, body);
  }
}
