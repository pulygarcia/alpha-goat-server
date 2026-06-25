import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const CLOUDINARY = 'CLOUDINARY';

export type CloudinaryApi = typeof cloudinary;

// Configura el SDK una vez al bootear y lo expone como provider inyectable,
// así los servicios atómicos reciben la instancia ya configurada y los tests
// pueden mockearla con el token CLOUDINARY.
export const cloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (config: ConfigService): CloudinaryApi => {
    cloudinary.config({
      cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: config.get<string>('CLOUDINARY_API_SECRET'),
    });
    return cloudinary;
  },
};
