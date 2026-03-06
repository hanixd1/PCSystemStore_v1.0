import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'; // <-- Añadido UploadApiResponse
import * as streamifier from 'streamifier';

export const uploadToCloudinary = (file: Express.Multer.File): Promise<string> => {
  // Configurar con tus variables de entorno
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'pc-system-store' }, 
      (error, result: UploadApiResponse | undefined) => { // <-- Tipado estricto aquí
        if (error) return reject(error);
        if (!result) return reject(new Error('Error desconocido al subir a Cloudinary')); // <-- Seguridad
        
        resolve(result.secure_url); // ¡Ahora TypeScript sabe que result es seguro!
      },
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};