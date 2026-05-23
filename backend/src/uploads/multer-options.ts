import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { imageFileFilter } from './image-file.filter';
import {
  MAX_ADMIN_IMAGE_SIZE_BYTES,
  MAX_ADMIN_IMAGES,
  MAX_ADMIN_UPLOAD_FIELDS,
  MAX_ADMIN_UPLOAD_PARTS,
  MAX_BANNER_IMAGE_SIZE_BYTES,
  MAX_BANNER_IMAGES,
  MAX_BANNER_UPLOAD_FIELDS,
  MAX_BANNER_UPLOAD_PARTS,
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_UPLOAD_FIELDS,
  MAX_PRODUCT_UPLOAD_PARTS,
  MAX_UPLOAD_FIELD_SIZE_BYTES,
} from './upload.constants';

// memoryStorage is intentionally used because files are immediately validated,
// uploaded/processed, and bounded by strict fileSize/files/parts/fieldSize limits.
// Do not remove limits while using memoryStorage.
export const PRODUCT_IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    // 4 MB per image, max 5 images. Bounded because memoryStorage keeps files in RAM.
    fileSize: MAX_PRODUCT_IMAGE_SIZE_BYTES,
    files: MAX_PRODUCT_IMAGES,
    fields: MAX_PRODUCT_UPLOAD_FIELDS,
    parts: MAX_PRODUCT_UPLOAD_PARTS,
    fieldSize: MAX_UPLOAD_FIELD_SIZE_BYTES,
  },
  fileFilter: imageFileFilter,
  storage: memoryStorage(),
};

export const ADMIN_IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    // 5 MB per image, max 1 image. Bounded because memoryStorage keeps files in RAM.
    fileSize: MAX_ADMIN_IMAGE_SIZE_BYTES,
    files: MAX_ADMIN_IMAGES,
    fields: MAX_ADMIN_UPLOAD_FIELDS,
    parts: MAX_ADMIN_UPLOAD_PARTS,
    fieldSize: MAX_UPLOAD_FIELD_SIZE_BYTES,
  },
  fileFilter: imageFileFilter,
  storage: memoryStorage(),
};

export const BANNER_IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    // 10 MB per banner image, max 1 image. Bounded because memoryStorage keeps files in RAM.
    fileSize: MAX_BANNER_IMAGE_SIZE_BYTES,
    files: MAX_BANNER_IMAGES,
    fields: MAX_BANNER_UPLOAD_FIELDS,
    parts: MAX_BANNER_UPLOAD_PARTS,
    fieldSize: MAX_UPLOAD_FIELD_SIZE_BYTES,
  },
  fileFilter: imageFileFilter,
  storage: memoryStorage(),
};
