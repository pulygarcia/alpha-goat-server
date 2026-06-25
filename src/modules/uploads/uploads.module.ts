import { Module } from '@nestjs/common';
import { cloudinaryProvider } from '../../config/cloudinary.config';
import { ImageRemover } from './services/image-remover';
import { ImageUploader } from './services/image-uploader';

// Infra reutilizable: encapsula el SDK de Cloudinary detrás de servicios
// atómicos y los exporta para que los módulos consumidores (users, etc) los
// inyecten. Sin entidad ni tabla propia.
@Module({
  providers: [cloudinaryProvider, ImageUploader, ImageRemover],
  exports: [ImageUploader, ImageRemover],
})
export class UploadsModule {}
