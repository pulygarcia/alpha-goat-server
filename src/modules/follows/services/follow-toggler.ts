import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFinder } from '../../users/services/user-finder';
import { UserFollow } from '../domain/user-follow.entity';

@Injectable()
export class FollowToggler {
  constructor(
    @InjectRepository(UserFollow)
    private readonly follows: Repository<UserFollow>,
    private readonly users: UserFinder,
  ) {}

  // Idempotente: si ya lo sigue, no hace nada. Valida que el target exista y
  // que no sea uno mismo (no tiene sentido seguirse).
  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('cannot follow yourself');
    }
    await this.users.byId(followingId);
    const exists = await this.follows.findOne({
      where: { followerId, followingId },
    });
    if (exists) return;
    await this.follows.save(this.follows.create({ followerId, followingId }));
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.follows.delete({ followerId, followingId });
  }

  // Ids de los usuarios que `followerId` sigue. Lo consume el feed para el
  // scope=following. Devuelve [] si no sigue a nadie.
  async followingIds(followerId: string): Promise<string[]> {
    const rows = await this.follows.find({
      where: { followerId },
      select: { followingId: true },
    });
    return rows.map((r) => r.followingId);
  }
}
