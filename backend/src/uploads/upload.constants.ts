export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per image
export const MAX_ADMIN_IMAGE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB for banner/logo/admin images
export const MAX_BANNER_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB for banner images

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
