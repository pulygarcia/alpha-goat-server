import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewLike } from '../domain/review-like.entity';
import { ReviewFinder } from './review-finder';

@Injectable()
export class ReviewLikeToggler {
  constructor(
    @InjectRepository(ReviewLike)
    private readonly likes: Repository<ReviewLike>,
    private readonly finder: ReviewFinder,
  ) {}

  async like(reviewId: string, userId: string): Promise<void> {
    await this.finder.byId(reviewId);
    const exists = await this.likes.findOne({ where: { reviewId, userId } });
    if (exists) return;
    await this.likes.save(this.likes.create({ reviewId, userId }));
  }

  async unlike(reviewId: string, userId: string): Promise<void> {
    await this.likes.delete({ reviewId, userId });
  }
}
