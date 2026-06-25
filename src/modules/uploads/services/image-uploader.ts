import { Inject, Injectable } from '@nestjs/common';
import { CLOUDINARY, CloudinaryApi } from '../../../config/cloudinary.config';

export interface UploadOptions {
  folder: string;
  publicId: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class ImageUploader {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: CloudinaryApi,
  ) {}

  // Streamea el buffer recibido (memory storage) a Cloudinary. `overwrite: true`
  // + publicId determinístico hace que re-subir pise el asset, sin huérfanos.
  upload(buffer: Buffer, { folder, publicId }: UploadOptions): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, overwrite: true, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }
}
