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

const IMAGE_SIGNATURES: Record<
  (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
  (bytes: Buffer) => boolean
> = {
  'image/jpeg': (bytes) =>
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) =>
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (bytes) =>
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP',
};

/**
 * The declared MIME type is client data: the first bytes must really be a JPEG, PNG or WEBP of
 * that type. Multer's fileFilter runs before the body is read, so this runs on the buffer.
 */
export function assertImageSignature(file: Pick<Express.Multer.File, 'buffer' | 'mimetype'>) {
  const matches = IMAGE_SIGNATURES[file.mimetype as keyof typeof IMAGE_SIGNATURES];
  if (!matches || !file.buffer || !matches(file.buffer)) {
    throw new BadRequestException('El archivo no es una imagen JPG, PNG o WEBP valida.');
  }
}
