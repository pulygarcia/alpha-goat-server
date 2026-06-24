import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { Review } from '../../reviews/domain/review.entity';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { UserFinder } from './user-finder';

@Injectable()
export class UserProfileAssembler {
  constructor(
    private readonly users: UserFinder,
    private readonly follows: FollowToggler,
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
  ) {}

  // Resuelve el perfil por username y arma el DTO enriquecido.
  // `viewerId` es el usuario autenticado (undefined si anónimo).
  async byUsername(
    username: string,
    viewerId?: string,
  ): Promise<ProfileResponseDto> {
    const user = await this.users.byUsernameOrFail(username);
    const isOwner = viewerId === user.id;

    const [followersCount, followingCount, reviewsCount] = await Promise.all([
      this.follows.countFollowers(user.id),
      this.follows.countFollowing(user.id),
      this.reviews.count({ where: { userId: user.id } }),
    ]);

    return ProfileResponseDto.from(user, {
      followersCount,
      followingCount,
      reviewsCount,
      isFollowing: await this.resolveIsFollowing(viewerId, user.id, isOwner),
      includeEmail: isOwner,
    });
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
