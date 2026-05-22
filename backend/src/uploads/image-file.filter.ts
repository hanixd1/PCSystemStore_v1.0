import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { ALLOWED_IMAGE_MIME_TYPES } from './upload.constants';

export const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])
  ) {
    return callback(new BadRequestException('Solo se permiten imagenes JPG, PNG o WEBP.'), false);
  }

  callback(null, true);
};
