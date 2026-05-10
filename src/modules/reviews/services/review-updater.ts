import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../domain/review.entity';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { ReviewFinder } from './review-finder';

@Injectable()
export class ReviewUpdater {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly finder: ReviewFinder,
  ) {}

  async execute(id: string, dto: UpdateReviewDto, userId: string): Promise<Review> {
    const review = await this.finder.byId(id);
    if (review.userId !== userId) {
      throw new ForbiddenException('only the author can edit this review');
    }

    Object.assign(review, dto);
    return this.reviews.save(review);
  }
}
