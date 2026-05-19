import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/roles.decorator';
import { uploadToCloudinary } from '../utils/cloudinary.util';
import { imageFileFilter } from './image-file.filter';
import { MAX_ADMIN_IMAGE_SIZE_BYTES } from './upload.constants';
import { MulterUploadExceptionFilter } from './multer-upload-exception.filter';

@Controller('admin/uploads')
export class UploadsController {
  @Roles('ADMIN')
  @Post('image')
  @UseFilters(
    new MulterUploadExceptionFilter('La imagen supera el tamano maximo permitido de 3 MB.'),
  )
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_ADMIN_IMAGE_SIZE_BYTES,
        files: 1,
      },
      fileFilter: imageFileFilter,
    }),
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
