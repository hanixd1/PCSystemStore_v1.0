import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator';
import {
  CLOUDINARY_UPLOAD_FOLDERS,
  CloudinaryService,
  CloudinaryUploadFolder,
} from './cloudinary.service';
import { MulterUploadExceptionFilter } from './multer-upload-exception.filter';
import { ADMIN_IMAGE_UPLOAD_OPTIONS, BANNER_IMAGE_UPLOAD_OPTIONS } from './multer-options';

type UploadType =
  | 'product'
  | 'products'
  | 'banner'
  | 'banners'
  | 'branding'
  | 'logo'
  | 'payment'
  | 'payments';

@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Roles('ADMIN')
  @Post('image')
  @UseFilters(new MulterUploadExceptionFilter('La imagen debe pesar como maximo 5 MB.'))
  @UseInterceptors(FileInterceptor('image', ADMIN_IMAGE_UPLOAD_OPTIONS))
  async uploadImage(@UploadedFile() file?: Express.Multer.File, @Query('type') type?: UploadType) {
    if (!file) {
      throw new BadRequestException('Debes enviar una imagen');
    }

    const uploaded = await this.cloudinaryService.uploadImage(file, this.resolveFolder(type));

    return {
      url: uploaded.secureUrl,
      secureUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      size: file.size,
      format: file.mimetype.split('/')[1],
    };
  }

  @Roles('ADMIN')
  @Post('banner-image')
  @UseFilters(new MulterUploadExceptionFilter('El banner debe pesar como maximo 10 MB.'))
  @UseInterceptors(FileInterceptor('image', BANNER_IMAGE_UPLOAD_OPTIONS))
  async uploadBannerImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes enviar una imagen');
    }

    const uploaded = await this.cloudinaryService.uploadImage(
      file,
      CLOUDINARY_UPLOAD_FOLDERS.banners,
    );

    return {
      url: uploaded.secureUrl,
      secureUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      size: file.size,
      format: file.mimetype.split('/')[1],
    };
  }

  private resolveFolder(type?: UploadType): CloudinaryUploadFolder {
    switch (type) {
      case 'banner':
      case 'banners':
        return CLOUDINARY_UPLOAD_FOLDERS.banners;
      case 'branding':
      case 'logo':
        return CLOUDINARY_UPLOAD_FOLDERS.branding;
      case 'payment':
      case 'payments':
        return CLOUDINARY_UPLOAD_FOLDERS.payments;
      case 'product':
      case 'products':
      default:
        return CLOUDINARY_UPLOAD_FOLDERS.products;
    }
  }
}
