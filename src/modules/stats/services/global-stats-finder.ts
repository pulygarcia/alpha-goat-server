import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { User } from '../../users/domain/user.entity';

export interface GlobalStatsResult {
  reviewsTotal: number;
  alfajoresTotal: number;
  usersTotal: number;
  alfajoresContributedByUsers: number;
}

/** Contadores globales para la página pública de stats. Todo vía repo API (`count`). */
@Injectable()
export class GlobalStatsFinder {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Alfajor) private readonly alfajores: Repository<Alfajor>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async execute(): Promise<GlobalStatsResult> {
    const [
      reviewsTotal,
      alfajoresTotal,
      usersTotal,
      alfajoresContributedByUsers,
    ] = await Promise.all([
      this.reviews.count(),
      this.alfajores.count({ where: { status: AlfajorStatus.APPROVED } }),
      this.users.count(),
      this.alfajores.count({
        where: {
          status: AlfajorStatus.APPROVED,
          createdById: Not(IsNull()),
        },
      }),
    ]);
    return {
      reviewsTotal,
      alfajoresTotal,
      usersTotal,
      alfajoresContributedByUsers,
    };
  }
}
