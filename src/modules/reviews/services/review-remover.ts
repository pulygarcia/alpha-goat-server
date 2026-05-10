import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { Review } from '../domain/review.entity';
import { ReviewFinder } from './review-finder';

export interface ActorContext {
  id: string;
  role: UserRole;
}

@Injectable()
export class ReviewRemover {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly finder: ReviewFinder,
  ) {}

  async execute(id: string, actor: ActorContext): Promise<void> {
    const review = await this.finder.byId(id);
    if (actor.role !== UserRole.ADMIN && review.userId !== actor.id) {
      throw new ForbiddenException('only the author or an admin can delete this review');
    }
    await this.reviews.remove(review);
  }
}
