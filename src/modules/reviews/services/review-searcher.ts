import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { Review } from '../domain/review.entity';
import { SearchReviewsDto } from '../dto/search-reviews.dto';

export interface ReviewRow {
  review: Review;
  likesCount: number;
  commentsCount: number;
  isFollowing: boolean;
}

export interface PaginatedReviewRows {
  items: ReviewRow[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ReviewSearcher {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly follows: FollowToggler,
  ) {}

  // `currentUserId` (opcional) resuelve `isFollowing`; anónimo => siempre false.
  async execute(
    dto: SearchReviewsDto,
    currentUserId?: string,
  ): Promise<PaginatedReviewRows> {
    const { alfajorId, userId, page, limit } = dto;

    const applyFilters = (qb: SelectQueryBuilder<Review>) => {
      if (alfajorId) qb.andWhere('r.alfajorId = :alfajorId', { alfajorId });
      if (userId) qb.andWhere('r.userId = :userId', { userId });
      return qb;
    };

    const total = await applyFilters(
      this.reviews.createQueryBuilder('r'),
    ).getCount();
    if (total === 0) return { items: [], total: 0, page, limit };

    // Paso 1: ids paginados + conteos por subquery (mismo enfoque que el feed:
    // hidratar entidades con joins + limit rompe el SQL de TypeORM).
    const rawRows = await applyFilters(this.reviews.createQueryBuilder('r'))
      .select('r.id', 'id')
      .addSelect(
        '(SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id)',
        'likesCount',
      )
      .addSelect(
        '(SELECT COUNT(*) FROM comments cm WHERE cm.review_id = r.id)',
        'commentsCount',
      )
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('r.id', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string; likesCount: string; commentsCount: string }>();

    // Paso 2: cargo las reseñas completas (con autor) y reordeno según el rank.
    const ids = rawRows.map((r) => r.id);
    const entities = await this.reviews.find({
      where: { id: In(ids) },
      relations: { user: true },
    });
    const byId = new Map(entities.map((e) => [e.id, e]));

    const rows: ReviewRow[] = rawRows.map((r) => ({
      review: byId.get(r.id)!,
      likesCount: Number(r.likesCount),
      commentsCount: Number(r.commentsCount),
      isFollowing: false,
    }));

    if (currentUserId) {
      const authorIds = [...new Set(rows.map((row) => row.review.userId))];
      const followed = await this.follows.followingAmong(
        currentUserId,
        authorIds,
      );
      for (const row of rows) {
        row.isFollowing = followed.has(row.review.userId);
      }
    }

    return { items: rows, total, page, limit };
  }
}
