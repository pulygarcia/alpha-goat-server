import { Inject, Injectable } from '@nestjs/common';
import { CLOUDINARY, CloudinaryApi } from '../../../config/cloudinary.config';

@Injectable()
export class ImageRemover {
  constructor(@Inject(CLOUDINARY) private readonly cloudinary: CloudinaryApi) {}

  // Borra el asset por publicId. Para consumidores que no usan publicId
  // determinístico + overwrite y necesitan limpiar huérfanos explícitamente.
  async remove(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
  }
}
