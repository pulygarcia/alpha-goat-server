import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Comment } from '../../comments/domain/comment.entity';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { Review } from '../../reviews/domain/review.entity';
import { ReviewLike } from '../../reviews/domain/review-like.entity';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { UserFinder } from './user-finder';

@Injectable()
export class UserProfileAssembler {
  constructor(
    private readonly users: UserFinder,
    private readonly follows: FollowToggler,
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(ReviewLike)
    private readonly reviewLikes: Repository<ReviewLike>,
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
  ) {}

  // Resuelve el perfil por username y arma el DTO enriquecido.
  // `viewerId` es el usuario autenticado (undefined si anónimo).
  async byUsername(
    username: string,
    viewerId?: string,
  ): Promise<ProfileResponseDto> {
    const user = await this.users.byUsernameOrFail(username);
    const isOwner = viewerId === user.id;

    const [
      followersCount,
      followingCount,
      reviewsCount,
      commentsCount,
      alfajoresAddedCount,
      likesReceivedCount,
      avgScore,
    ] = await Promise.all([
      this.follows.countFollowers(user.id),
      this.follows.countFollowing(user.id),
      this.reviews.count({ where: { userId: user.id } }),
      this.comments.count({ where: { userId: user.id } }),
      this.alfajores.count({
        where: { createdById: user.id, status: AlfajorStatus.APPROVED },
      }),
      this.countLikesReceived(user.id),
      this.avgScore(user.id),
    ]);

    return ProfileResponseDto.from(user, {
      followersCount,
      followingCount,
      reviewsCount,
      commentsCount,
      alfajoresAddedCount,
      likesReceivedCount,
      avgScore,
      isFollowing: await this.resolveIsFollowing(viewerId, user.id, isOwner),
      includeEmail: isOwner,
    });
  }

  // Likes recibidos = likes sobre las reseñas escritas por el usuario.
  private countLikesReceived(userId: string): Promise<number> {
    return this.reviewLikes
      .createQueryBuilder('rl')
      .innerJoin('rl.review', 'r')
      .where('r.userId = :userId', { userId })
      .getCount();
  }

  // Promedio del rating general; null si el usuario no reseñó.
  private async avgScore(userId: string): Promise<number | null> {
    const raw = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.ratingGeneral)', 'avg')
      .where('r.userId = :userId', { userId })
      .getRawOne<{ avg: string | null }>();
    if (raw?.avg == null) return null;
    return Math.round(Number(raw.avg) * 10) / 10;
  }

  // null en el propio perfil; false anónimo; true/false según la relación.
  private async resolveIsFollowing(
    viewerId: string | undefined,
    profileId: string,
    isOwner: boolean,
  ): Promise<boolean | null> {
    if (isOwner) return null;
    if (!viewerId) return false;
    const followed = await this.follows.followingAmong(viewerId, [profileId]);
    return followed.has(profileId);
  }
}
