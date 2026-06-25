import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImageUploader } from '../../uploads/services/image-uploader';
import { User } from '../domain/user.entity';
import { UserFinder } from './user-finder';

@Injectable()
export class AvatarUpdater {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly finder: UserFinder,
    private readonly uploader: ImageUploader,
  ) {}

  // Sube la imagen a Cloudinary con publicId determinístico (= user.id) y
  // overwrite, así re-subir pisa el avatar anterior sin huérfanos, y persiste
  // la URL pública en el usuario.
  async execute(userId: string, buffer: Buffer): Promise<User> {
    const user = await this.finder.byId(userId);

    const { url } = await this.uploader.upload(buffer, {
      folder: 'avatars',
      publicId: user.id,
    });

    user.avatarUrl = url;
    return this.users.save(user);
  }
}
