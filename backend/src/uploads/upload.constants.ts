export const BYTES_PER_MB = 1024 * 1024;

export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 4 * BYTES_PER_MB;
export const MAX_ADMIN_IMAGE_SIZE_BYTES = 5 * BYTES_PER_MB;
export const MAX_BANNER_IMAGE_SIZE_BYTES = 10 * BYTES_PER_MB;

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_ADMIN_IMAGES = 1;
export const MAX_BANNER_IMAGES = 1;

export const MAX_UPLOAD_FIELD_SIZE_BYTES = 64 * 1024;

export const MAX_PRODUCT_UPLOAD_FIELDS = 20;
export const MAX_PRODUCT_UPLOAD_PARTS = 30;

export const MAX_ADMIN_UPLOAD_FIELDS = 10;
export const MAX_ADMIN_UPLOAD_PARTS = 15;

export const MAX_BANNER_UPLOAD_FIELDS = 10;
export const MAX_BANNER_UPLOAD_PARTS = 15;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
