import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtUserPayload } from '../auth/auth.constants';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { BrandingService } from './branding.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@Controller()
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Public()
  @Get('public/branding')
  getPublicBranding() {
    return this.brandingService.getBranding();
  }

  @Public()
  @Get('public/banners')
  getPublicBanners() {
    return this.brandingService.getPublicBanners();
  }

  @Roles('ADMIN')
  @Get('admin/branding')
  getAdminBranding() {
    return this.brandingService.getBranding();
  }

  @Roles('ADMIN')
  @Patch('admin/branding')
  updateBranding(
    @Body() body: UpdateBrandingDto,
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    return this.brandingService.updateBranding(body, request.user.sub);
  }

  @Roles('ADMIN')
  @Get('admin/banners')
  getAdminBanners() {
    return this.brandingService.getAdminBanners();
  }

  @Roles('ADMIN')
  @Post('admin/banners')
  createBanner(@Body() body: CreateBannerDto, @Req() request: Request & { user: JwtUserPayload }) {
    return this.brandingService.createBanner(body, request.user.sub);
  }

  @Roles('ADMIN')
  @Patch('admin/banners/:id')
  updateBanner(
    @Param('id') id: string,
    @Body() body: UpdateBannerDto,
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    return this.brandingService.updateBanner(id, body, request.user.sub);
  }

  @Roles('ADMIN')
  @Patch('admin/banners/:id/toggle')
  toggleBanner(@Param('id') id: string, @Req() request: Request & { user: JwtUserPayload }) {
    return this.brandingService.toggleBanner(id, request.user.sub);
  }

  @Roles('ADMIN')
  @Delete('admin/banners/:id')
  deleteBanner(@Param('id') id: string, @Req() request: Request & { user: JwtUserPayload }) {
    return this.brandingService.deleteBanner(id, request.user.sub);
  }
}
