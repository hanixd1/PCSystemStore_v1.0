import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

export const CLOUDINARY_UPLOAD_FOLDERS = {
  products: 'pcsystemstore/products',
  banners: 'pcsystemstore/banners',
  branding: 'pcsystemstore/branding',
  payments: 'pcsystemstore/payments',
} as const;

export type CloudinaryUploadFolder =
  (typeof CLOUDINARY_UPLOAD_FOLDERS)[keyof typeof CLOUDINARY_UPLOAD_FOLDERS];

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: CloudinaryUploadFolder,
  ): Promise<CloudinaryUploadResult> {
    this.ensureConfigured();

    if (!file?.buffer?.length) {
      throw new BadRequestException('Debes enviar una imagen valida.');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          overwrite: false,
          resource_type: 'image',
          unique_filename: true,
          use_filename: false,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(
              new InternalServerErrorException('No se pudo subir la imagen a Cloudinary.'),
            );
          }

          if (!result?.secure_url || !result.public_id) {
            return reject(
              new InternalServerErrorException('Cloudinary no devolvio una URL segura.'),
            );
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    this.ensureConfigured();

    if (!publicId.trim()) {
      return;
    }

    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }

  private ensureConfigured(): void {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new InternalServerErrorException(
        'Cloudinary no esta configurado. Revisa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.',
      );
    }
  }
}
