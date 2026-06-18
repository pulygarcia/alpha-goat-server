import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { Review } from '../../reviews/domain/review.entity';
import { ReviewLikeToggler } from '../../reviews/services/review-like-toggler';
import { FeedQueryDto, FeedScope, FeedSort } from '../dto/feed-query.dto';

export interface FeedRow {
  review: Review;
  likes: number;
  commentsCount: number;
  isFollowing: boolean;
  isLiked: boolean;
}

export interface FeedResult {
  rows: FeedRow[];
  total: number;
  page: number;
  limit: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class FeedFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly follows: FollowToggler,
    private readonly likes: ReviewLikeToggler,
  ) {}

  // `userId` opcional: el feed es público (anónimo lo ve con isFollowing/isLiked
  // en false). `now` se inyecta para testear las ventanas today/week sin tocar el reloj.
  async execute(
    dto: FeedQueryDto,
    userId?: string,
    now: Date = new Date(),
  ): Promise<FeedResult> {
    const { scope, sort, province, page, limit } = dto;

    if (scope === FeedScope.PROVINCE && !province) {
      throw new BadRequestException('province is required when scope=province');
    }

    // scope=following es personal: sin sesión no tiene sentido.
    if (scope === FeedScope.FOLLOWING && !userId) {
      throw new BadRequestException('following feed requires authentication');
    }

    // scope=following sin seguidos → feed vacío. Cortamos antes de armar la query
    // porque `IN (:...[])` con lista vacía genera SQL inválido.
    let followingIds: string[] | null = null;
    if (scope === FeedScope.FOLLOWING) {
      followingIds = await this.follows.followingIds(userId!);
      if (followingIds.length === 0) return { rows: [], total: 0, page, limit };
    }

    // Aplica los filtros de scope a un qb nuevo. Se reusa en la query de conteo
    // y en la de datos para que `total` siempre coincida con lo listado.
    const applyFilters = (qb: SelectQueryBuilder<Review>) => {
      qb.innerJoin('r.alfajor', 'a')
        .innerJoin('a.marca', 'm')
        .where('a.status = :status', { status: AlfajorStatus.APPROVED });

      switch (scope) {
        case FeedScope.TODAY:
          qb.andWhere('r.createdAt >= :from', { from: startOfDay(now) });
          break;
        case FeedScope.WEEK:
          qb.andWhere('r.createdAt >= :from', {
            from: new Date(now.getTime() - WEEK_MS),
          });
          break;
        case FeedScope.FOLLOWING:
          qb.andWhere('r.userId IN (:...followingIds)', { followingIds });
          break;
        case FeedScope.PROVINCE:
          qb.andWhere('m.provincia ILIKE :province', { province });
          break;
      }
      return qb;
    };

    const total = await applyFilters(
      this.reviews.createQueryBuilder('r'),
    ).getCount();
    if (total === 0) return { rows: [], total: 0, page, limit };

    // Paso 1: traemos SOLO ids ordenados/paginados + los conteos calculados.
    // Hidratar entidades con joins + orden por un alias calculado + limit hace
    // que TypeORM arme un SQL inválido (sub-query distinct rota), así que el
    // orden y la paginación van en esta query plana de ids.
    const ranked = applyFilters(this.reviews.createQueryBuilder('r'))
      .select('r.id', 'id')
      .addSelect(
        '(SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id)',
        'likesCount',
      )
      .addSelect(
        '(SELECT COUNT(*) FROM comments cm WHERE cm.review_id = r.id)',
        'commentsCount',
      );

    // Las comillas dobles en los alias son necesarias: Postgres baja a lowercase
    // los identificadores sin comillar y nuestros alias son camelCase.
    switch (sort) {
      case FeedSort.LIKES:
        ranked
          .orderBy('"likesCount"', 'DESC')
          .addOrderBy('r.createdAt', 'DESC');
        break;
      case FeedSort.RATING:
        ranked
          .orderBy('r.ratingGeneral', 'DESC')
          .addOrderBy('r.createdAt', 'DESC');
        break;
      case FeedSort.RECENT:
      default:
        ranked.orderBy('r.createdAt', 'DESC').addOrderBy('r.id', 'DESC');
        break;
    }

    const rawRows = await ranked
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string; likesCount: string; commentsCount: string }>();

    // Paso 2: cargamos las reseñas completas (con relaciones) de esos ids.
    // `find` no garantiza orden, así que reordenamos según `rawRows`.
    const ids = rawRows.map((r) => r.id);
    const entities = await this.reviews.find({
      where: { id: In(ids) },
      relations: { alfajor: { marca: true }, user: true },
    });
    const byId = new Map(entities.map((e) => [e.id, e]));

    const rows: FeedRow[] = rawRows.map((r) => ({
      review: byId.get(r.id)!,
      likes: Number(r.likesCount),
      commentsCount: Number(r.commentsCount),
      isFollowing: false,
      isLiked: false,
    }));

    // Flags personales solo con sesión (anónimo => false). Acotados a esta página:
    // los autores para el follow, las reseñas para el like.
    if (userId) {
      const authorIds = [...new Set(rows.map((row) => row.review.user!.id))];
      const followed = await this.follows.followingAmong(userId, authorIds);
      const liked = await this.likes.likedAmong(
        userId,
        rows.map((row) => row.review.id),
      );
      for (const row of rows) {
        row.isFollowing = followed.has(row.review.user!.id);
        row.isLiked = liked.has(row.review.id);
      }
    }

    return { rows, total, page, limit };
  }
}

function startOfDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
