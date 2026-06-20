import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewFinder } from '../../reviews/services/review-finder';
import { Comment } from '../domain/comment.entity';
import { SearchCommentsDto } from '../dto/search-comments.dto';
import { CommentLikeToggler } from './comment-like-toggler';

export interface CommentRow {
  comment: Comment;
  likesCount: number;
  isLiked: boolean;
}

export interface PaginatedComments {
  items: CommentRow[];
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
    private readonly likes: CommentLikeToggler,
  ) {}

  // `currentUserId` (opcional) resuelve `isLiked`; anónimo => false.
  async execute(
    reviewId: string,
    dto: SearchCommentsDto,
    currentUserId?: string,
  ): Promise<PaginatedComments> {
    await this.reviewFinder.byId(reviewId);
    const { page, limit } = dto;
    const [items, total] = await this.comments.findAndCount({
      where: { reviewId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const ids = items.map((c) => c.id);
    const counts = await this.likes.countAmong(ids);
    const liked = currentUserId
      ? await this.likes.likedAmong(currentUserId, ids)
      : new Set<string>();

    const rows: CommentRow[] = items.map((comment) => ({
      comment,
      likesCount: counts.get(comment.id) ?? 0,
      isLiked: liked.has(comment.id),
    }));

    return { items: rows, total, page, limit };
  }
}
