import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private isValidVisualUrl(value?: string) {
    if (!value) return true;
    return value.startsWith('/uploads/') || /^https?:\/\/[^\s<>"']+$/i.test(value);
  }

  private isValidLink(value?: string) {
    if (!value) return true;
    return value.startsWith('/') || /^https?:\/\/[^\s<>"']+$/i.test(value);
  }

  private validateBranding(data: UpdateBrandingDto) {
    if (data.logoUrl && !this.isValidVisualUrl(data.logoUrl)) {
      throw new BadRequestException('La imagen del logo no tiene una ruta valida');
    }
  }

  private validateBanner(data: CreateBannerDto | UpdateBannerDto) {
    if ('imageUrl' in data && data.imageUrl !== undefined && !this.isValidVisualUrl(data.imageUrl)) {
      throw new BadRequestException('La URL de imagen desktop debe ser una URL http/https valida');
    }

    if (data.mobileImageUrl && !this.isValidVisualUrl(data.mobileImageUrl)) {
      throw new BadRequestException('La URL de imagen mobile debe ser una URL http/https valida');
    }

    if (data.linkUrl && !this.isValidLink(data.linkUrl)) {
      throw new BadRequestException('El link destino debe ser una ruta interna o una URL valida');
    }

    if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
      throw new BadRequestException('La fecha inicio no puede ser posterior a la fecha fin');
    }
  }

  async getBranding() {
    const branding = await this.prisma.storeBranding.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (branding) {
      return branding;
    }

    return this.prisma.storeBranding.create({
      data: {
        storeName: 'PCSystemStore',
        logoAlt: 'PCSystemStore',
      },
    });
  }

  async updateBranding(data: UpdateBrandingDto, actorId?: string) {
    this.validateBranding(data);
    const branding = await this.getBranding();

    const updated = await this.prisma.storeBranding.update({
      where: { id: branding.id },
      data: {
        storeName: data.storeName || branding.storeName,
        logoUrl: data.logoUrl || null,
        logoAlt: data.logoAlt || data.storeName || branding.logoAlt || 'PCSystemStore',
      },
    });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'UPDATE_BRANDING',
        module: 'BRANDING',
        entityType: 'BRANDING',
        entityId: updated.id,
        entityName: updated.storeName,
        description: 'Actualizo la marca visual de la tienda.',
      });
    }

    return updated;
  }

  getAdminBanners() {
    return this.prisma.homeBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  getPublicBanners() {
    return this.prisma.homeBanner.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createBanner(data: CreateBannerDto, actorId?: string) {
    this.validateBanner(data);

    const banner = await this.prisma.homeBanner.create({
      data: {
        title: data.title,
        subtitle: data.subtitle || null,
        imageUrl: data.imageUrl,
        mobileImageUrl: data.mobileImageUrl || null,
        linkUrl: data.linkUrl || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'CREATE_BANNER',
        module: 'BANNERS',
        entityType: 'BANNER',
        entityId: banner.id,
        entityName: banner.title,
        description: `Creo el banner ${banner.title}.`,
      });
    }

    return banner;
  }

  async updateBanner(id: string, data: UpdateBannerDto, actorId?: string) {
    this.validateEntityId(id);
    this.validateBanner(data);
    const current = await this.ensureBannerExists(id);

    const banner = await this.prisma.homeBanner.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.subtitle !== undefined ? { subtitle: data.subtitle || null } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.mobileImageUrl !== undefined ? { mobileImageUrl: data.mobileImageUrl || null } : {}),
        ...(data.linkUrl !== undefined ? { linkUrl: data.linkUrl || null } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.startsAt !== undefined ? { startsAt: data.startsAt ? new Date(data.startsAt) : null } : {}),
        ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
      },
    });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'UPDATE_BANNER',
        module: 'BANNERS',
        entityType: 'BANNER',
        entityId: banner.id,
        entityName: banner.title,
        description: `Actualizo el banner ${current.title}.`,
      });
    }

    return banner;
  }

  async toggleBanner(id: string, actorId?: string) {
    this.validateEntityId(id);
    const banner = await this.ensureBannerExists(id);
    const updated = await this.prisma.homeBanner.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: updated.isActive ? 'ENABLE_BANNER' : 'DISABLE_BANNER',
        module: 'BANNERS',
        entityType: 'BANNER',
        entityId: updated.id,
        entityName: updated.title,
        fieldName: 'isActive',
        oldValue: String(banner.isActive),
        newValue: String(updated.isActive),
        description: `${updated.isActive ? 'Activo' : 'Desactivo'} el banner ${updated.title}.`,
      });
    }

    return updated;
  }

  async deleteBanner(id: string, actorId?: string) {
    this.validateEntityId(id);
    const banner = await this.ensureBannerExists(id);
    await this.prisma.homeBanner.delete({ where: { id } });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'DELETE_BANNER',
        module: 'BANNERS',
        entityType: 'BANNER',
        entityId: banner.id,
        entityName: banner.title,
        description: `Elimino el banner ${banner.title}.`,
      });
    }

    return { message: 'Banner eliminado correctamente' };
  }

  private async ensureBannerExists(id: string) {
    const banner = await this.prisma.homeBanner.findUnique({ where: { id } });
    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    return banner;
  }

  private validateEntityId(id: string) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Identificador de banner invalido');
    }
  }
}
