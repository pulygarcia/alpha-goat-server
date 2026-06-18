import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  // Subconjunto de `reviewIds` que `userId` likeó. Acotado a las reseñas de una
  // página (mismo enfoque que FollowToggler.followingAmong). Set vacío sin query
  // si no hay candidatos.
  async likedAmong(userId: string, reviewIds: string[]): Promise<Set<string>> {
    if (reviewIds.length === 0) return new Set();
    const rows = await this.likes.find({
      where: { userId, reviewId: In(reviewIds) },
      select: { reviewId: true },
    });
    return new Set(rows.map((r) => r.reviewId));
  }
}
