import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type * as express from 'express';
import { CsrfTokenService } from '../auth/csrf-token.service';
import {
  CSRF_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  SessionScope,
  getClearCsrfCookieOptions,
  getClearGoogleOAuthStateCookieOptions,
  getClearSessionCookieOptions,
  getCookieValue,
  getGoogleOAuthStateCookieOptions,
  getSessionCookieName,
  getSessionCookieOptions,
} from '../auth/auth-cookies';
import { JwtUserPayload } from '../auth/auth.constants';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { GoogleOAuthCallbackDto } from './dto/google-oauth-callback.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = express.Request & { user: JwtUserPayload };
function setSessionCookie(response: express.Response, scope: SessionScope, token: string) {
  response.cookie(getSessionCookieName(scope), token, getSessionCookieOptions(scope));
}

function clearSessionCookie(response: express.Response, scope: SessionScope) {
  response.clearCookie(getSessionCookieName(scope), getClearSessionCookieOptions(scope));
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly csrf: CsrfTokenService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('login')
  async login(
    @Body() body: LoginUserDto,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.customerLogin(body.email, body.password, request);
    setSessionCookie(response, 'customer', session.token);
    const csrfToken = this.csrf.issue(response);
    return { ...session, csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('customer-login')
  async customerLogin(
    @Body() body: LoginUserDto,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.customerLogin(body.email, body.password, request);
    setSessionCookie(response, 'customer', session.token);
    const csrfToken = this.csrf.issue(response);
    return { ...session, csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 4, ttl: 15 * 60 * 1000 } })
  @Post('admin-login')
  async adminLogin(
    @Body() body: LoginUserDto,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.adminLogin(body.email, body.password, request);
    setSessionCookie(response, 'admin', session.token);
    const csrfToken = this.csrf.issue(response);
    return { ...session, csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @Post('register')
  register(@Body() body: RegisterUserDto) {
    return this.usersService.register(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post('google-auth')
  async googleAuth(
    @Body() body: GoogleAuthDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.loginWithGoogle(body.credential || body.idToken || '');
    setSessionCookie(response, 'customer', session.token);
    const csrfToken = this.csrf.issue(response);
    return { ...session, csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post('google-login')
  async googleLogin(
    @Body() body: GoogleAuthDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.loginWithGoogle(body.credential || body.idToken || '');
    setSessionCookie(response, 'customer', session.token);
    const csrfToken = this.csrf.issue(response);
    return { ...session, csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @Post('google-register')
  async googleRegister(
    @Body() body: GoogleAuthDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const session = await this.usersService.registerWithGoogle(
      body.credential || body.idToken || '',
    );
    setSessionCookie(response, 'customer', session.token);
    const csrfToken = this.csrf.issue(response);
    return { ...session, csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Get('google/oauth-url')
  googleOAuthUrl(
    @Query('mode') mode: string,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const result = this.usersService.createGoogleOAuthUrl(mode);
    response.cookie(
      GOOGLE_OAUTH_STATE_COOKIE,
      result.cookieValue,
      getGoogleOAuthStateCookieOptions(),
    );

    return { authUrl: result.authUrl };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post('google/callback')
  async googleOAuthCallback(
    @Body() body: GoogleOAuthCallbackDto,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    try {
      const session = await this.usersService.handleGoogleOAuthCallback(
        body.code,
        body.state,
        getCookieValue(request, GOOGLE_OAUTH_STATE_COOKIE),
      );
      setSessionCookie(response, 'customer', session.token);
      const csrfToken = this.csrf.issue(response);
      response.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, getClearGoogleOAuthStateCookieOptions());
      return { ...session, csrfToken };
    } catch (error) {
      response.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, getClearGoogleOAuthStateCookieOptions());
      throw error;
    }
  }

  @Post('customer-logout')
  @Roles('CUSTOMER')
  async customerLogout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    clearSessionCookie(response, 'customer');
    response.clearCookie(CSRF_COOKIE, getClearCsrfCookieOptions());
    await this.usersService.recordLogout(request.user.sub, 'CUSTOMER_LOGOUT');
    return { message: 'Sesion de cliente cerrada' };
  }

  @Post('admin-logout')
  @Roles('ADMIN', 'EDITOR')
  async adminLogout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    clearSessionCookie(response, 'admin');
    response.clearCookie(CSRF_COOKIE, getClearCsrfCookieOptions());
    await this.usersService.recordLogout(request.user.sub, 'ADMIN_LOGOUT');
    return { message: 'Sesion administrativa cerrada' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.usersService.forgotPassword(body.email, body.flow ?? 'client');
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @Post('customer-forgot-password')
  customerForgotPassword(@Body() body: ForgotPasswordDto) {
    return this.usersService.forgotPassword(body.email, 'client');
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @Post('admin-forgot-password')
  adminForgotPassword(@Body() body: ForgotPasswordDto) {
    return this.usersService.forgotPassword(body.email, 'admin');
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(body.token, body.newPassword);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @Post('customer-reset-password')
  customerResetPassword(@Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(body.token, body.newPassword, 'client');
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @Post('admin-reset-password')
  adminResetPassword(@Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(body.token, body.newPassword, 'admin');
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @Post('customer-set-password')
  customerSetPassword(@Body() body: SetPasswordDto) {
    return this.usersService.setCustomerPassword(body.token, body.password, body.confirmPassword);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.usersService.verifyEmail(body.token);
  }

  @Roles('CUSTOMER')
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.usersService.getMe(request.user.sub);
  }

  @Roles('ADMIN', 'EDITOR')
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
  @Post('editors')
  createEditor(@Body() body: CreateUserDto) {
    return this.usersService.createEditor(body);
  }

  @Roles('ADMIN')
  @Post('internal')
  createInternalUser(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Roles('ADMIN')
  @Get('editors')
  findEditors() {
    return this.usersService.findEditors();
  }

  @Roles('ADMIN')
  @Get('internal')
  findInternalUsers() {
    return this.usersService.findInternalUsers();
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
  toggleStatus(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.toggleStatus(id, request.user.sub);
  }

  @Roles('ADMIN')
  @Patch('internal/:id')
  updateInternalUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updateUser(id, body, request.user.sub);
  }

  @Roles('ADMIN')
  @Patch(':id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updateUser(id, body, request.user.sub);
  }
}
