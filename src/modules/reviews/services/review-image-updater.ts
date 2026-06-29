import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImageUploader } from '../../uploads/services/image-uploader';
import { Review } from '../domain/review.entity';
import { ReviewFinder } from './review-finder';

@Injectable()
export class ReviewImageUpdater {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly finder: ReviewFinder,
    private readonly uploader: ImageUploader,
  ) {}

  // Uploads to Cloudinary with a deterministic publicId (= review.id) and
  // overwrite, so re-uploading replaces the previous asset without orphans, and
  // persists the public URL on the review. Only the author may upload.
  async execute(id: string, buffer: Buffer, userId: string): Promise<Review> {
    const review = await this.finder.byId(id);
    if (review.userId !== userId) {
      throw new ForbiddenException('only the author can edit this review');
    }

    const { url } = await this.uploader.upload(buffer, {
      folder: 'reviews',
      publicId: review.id,
    });

    review.fotoUrl = url;
    return this.reviews.save(review);
  }
}
