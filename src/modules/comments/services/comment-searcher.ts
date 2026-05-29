import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewFinder } from '../../reviews/services/review-finder';
import { Comment } from '../domain/comment.entity';
import { SearchCommentsDto } from '../dto/search-comments.dto';

export interface PaginatedComments {
  items: Comment[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CommentSearcher {
  constructor(
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    private readonly reviewFinder: ReviewFinder,
  ) {}

  async execute(
    reviewId: string,
    dto: SearchCommentsDto,
  ): Promise<PaginatedComments> {
    await this.reviewFinder.byId(reviewId);
    const { page, limit } = dto;
    const [items, total] = await this.comments.findAndCount({
      where: { reviewId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
