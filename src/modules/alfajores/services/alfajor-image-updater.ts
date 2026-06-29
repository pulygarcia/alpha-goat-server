import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImageUploader } from '../../uploads/services/image-uploader';
import { Alfajor } from '../domain/alfajor.entity';
import {
  ActorContext,
  assertCanEditAlfajor,
} from '../domain/assert-can-edit-alfajor';
import { AlfajorFinder } from './alfajor-finder';

@Injectable()
export class AlfajorImageUpdater {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    private readonly finder: AlfajorFinder,
    private readonly uploader: ImageUploader,
  ) {}

  // Uploads to Cloudinary with a deterministic publicId (= alfajor.id) and
  // overwrite, so re-uploading replaces the previous asset without orphans, and
  // persists the public URL on the alfajor.
  async execute(
    id: string,
    buffer: Buffer,
    actor: ActorContext,
  ): Promise<Alfajor> {
    const alfajor = await this.finder.byId(id);

    assertCanEditAlfajor(alfajor, actor);

    const { url } = await this.uploader.upload(buffer, {
      folder: 'alfajores',
      publicId: alfajor.id,
    });

    alfajor.imagenUrl = url;
    return this.alfajores.save(alfajor);
  }
}
