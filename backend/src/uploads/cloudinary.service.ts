import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { assertImageSignature } from './image-file.filter';

export const CLOUDINARY_UPLOAD_FOLDERS = {
  products: 'pcsystemstore/products',
  banners: 'pcsystemstore/banners',
  branding: 'pcsystemstore/branding',
  payments: 'pcsystemstore/payments',
} as const;

export type CloudinaryUploadFolder =
  (typeof CLOUDINARY_UPLOAD_FOLDERS)[keyof typeof CLOUDINARY_UPLOAD_FOLDERS];

/**
 * What `uploadImage` produces: `unique_filename` gives an alphanumeric id inside one of our
 * folders. Anything else (other folders, dot segments, encodings) is never deleted.
 */
const UPLOADED_ID = /^[A-Za-z0-9_-]{1,100}$/;
/** Path of an uploaded asset: optional version, folder, id and extension, nothing more. */
const UPLOADED_PATH = /^(?:v\d+\/)?([a-z/]+)\/([^/]+)\.(?:jpe?g|png|webp)$/i;

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

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
    assertImageSignature(file);

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

  /**
   * Public id of an image this app uploaded to `folder`
   * (`https://res.cloudinary.com/<cloud>/image/upload/v123/<folder>/<id>.<ext>`), or null.
   *
   * The raw URL is checked, not the parsed one: WHATWG URL parsing resolves `%2e%2e` and `..`,
   * so `products/%2e%2e/branding/logo.png` would otherwise point at the store logo.
   */
  getOwnedPublicId(url: string | null | undefined, folder: CloudinaryUploadFolder): string | null {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
    if (!url || !cloudName || !url.startsWith(prefix)) {
      return null;
    }
    const path = url.slice(prefix.length);
    if (/[%\\?#]|\/\/|(^|\/)\.\.?(\/|$)/.test(path)) {
      return null;
    }
    const match = UPLOADED_PATH.exec(path);
    if (!match || match[1] !== folder || !UPLOADED_ID.test(match[2])) {
      return null;
    }
    return `${folder}/${match[2]}`;
  }

  /**
   * Best-effort cleanup of images no longer referenced (removed from a product or a banner),
   * limited to that module's folder. A Cloudinary failure never fails the request.
   */
  async deleteImagesByUrl(
    urls: Array<string | null | undefined>,
    folder: CloudinaryUploadFolder,
  ): Promise<void> {
    const publicIds = [...new Set(urls.map((url) => this.getOwnedPublicId(url, folder)))].filter(
      (publicId): publicId is string => Boolean(publicId),
    );
    await Promise.all(
      publicIds.map((publicId) =>
        this.deleteImage(publicId).catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          this.logger.warn(`No se pudo borrar ${publicId} de Cloudinary: ${reason}`);
        }),
      ),
    );
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
