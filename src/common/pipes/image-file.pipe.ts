import {
  BadRequestException,
  Injectable,
  PipeTransform,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface UploadedImage {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Valida el archivo recibido (memory storage) antes de subirlo: tipo permitido
// y tamaño máximo. Reutilizable por todos los consumidores de uploads.
@Injectable()
export class ImageFilePipe implements PipeTransform<
  UploadedImage | undefined,
  UploadedImage
> {
  transform(file: UploadedImage | undefined): UploadedImage {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('file must not exceed 5 MB');
    }

    return file;
  }
}
