import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator';
import { uploadToCloudinary } from '../utils/cloudinary.util';
import { MulterUploadExceptionFilter } from './multer-upload-exception.filter';
import { ADMIN_IMAGE_UPLOAD_OPTIONS } from './multer-options';

@Controller('admin/uploads')
export class UploadsController {
  @Roles('ADMIN')
  @Post('image')
  @UseFilters(
    new MulterUploadExceptionFilter('La imagen supera el tamano maximo permitido de 3 MB.'),
  )
  @UseInterceptors(
    FileInterceptor('image', ADMIN_IMAGE_UPLOAD_OPTIONS),
  )
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes enviar una imagen');
    }

    const url = await uploadToCloudinary(file);
    return {
      url,
      size: file.size,
      format: file.mimetype.split('/')[1],
    };
  }
}
