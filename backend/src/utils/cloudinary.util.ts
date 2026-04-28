import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'tu_cloud_name',
  );
}

async function saveFileLocally(file: Express.Multer.File) {
  const uploadsDir = path.resolve(
    process.cwd(),
    '..',
    'frontend',
    'public',
    'uploads',
  );
  await fs.mkdir(uploadsDir, { recursive: true });

  const extension = path.extname(file.originalname) || '.jpg';
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const finalPath = path.join(uploadsDir, fileName);

  await fs.writeFile(finalPath, file.buffer);

  return `/uploads/${fileName}`;
}

export const uploadToCloudinary = async (
  file: Express.Multer.File,
): Promise<string> => {
  if (!hasCloudinaryConfig()) {
    return saveFileLocally(file);
  }

  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'pc-system-store' },
        (error, result: UploadApiResponse | undefined) => {
          if (error) return reject(error);
          if (!result)
            return reject(new Error('Error desconocido al subir a Cloudinary'));

          resolve(result.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  } catch {
    return saveFileLocally(file);
  }
};
