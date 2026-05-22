import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { imageFileFilter } from './image-file.filter';
import { MAX_BANNER_IMAGE_SIZE_BYTES } from './upload.constants';

// Security: Multer memoryStorage is bounded by limits.fileSize, limits.files,
// limits.fields, limits.parts and limits.fieldSize. This avoids unbounded memory usage.
export const PRODUCT_IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    // 2 MB per image. Prevents unbounded memory usage with memoryStorage.
    fileSize: 2 * 1024 * 1024,
    files: 5,
    fields: 20,
    parts: 30,
    fieldSize: 64 * 1024,
  },
  fileFilter: imageFileFilter,
  storage: memoryStorage(),
};

// Security: used for admin logo/banner image uploads through a single-file endpoint.
export const ADMIN_IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    // 3 MB per image. Prevents unbounded memory usage with memoryStorage.
    fileSize: 3 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 15,
    fieldSize: 64 * 1024,
  },
  fileFilter: imageFileFilter,
  storage: memoryStorage(),
};

// Security: banner uploads can be larger because the recommended asset is 1800 x 600 px.
export const BANNER_IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    // 10 MB per banner image. Still bounded to avoid unbounded memory usage with memoryStorage.
    fileSize: MAX_BANNER_IMAGE_SIZE_BYTES,
    files: 1,
    fields: 10,
    parts: 15,
    fieldSize: 64 * 1024,
  },
  fileFilter: imageFileFilter,
  storage: memoryStorage(),
};
