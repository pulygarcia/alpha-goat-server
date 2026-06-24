import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Comment } from '../../comments/domain/comment.entity';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { Review } from '../../reviews/domain/review.entity';
import { ReviewLike } from '../../reviews/domain/review-like.entity';
import { UserRole } from '../domain/user-role.enum';
import { User } from '../domain/user.entity';
import { UserFinder } from './user-finder';
import { UserProfileAssembler } from './user-profile-assembler';

// qb chainable que resuelve getCount / getRawOne.
const makeQb = (result: { count?: number; raw?: unknown }) => {
  const qb: any = {};
  for (const m of ['select', 'innerJoin', 'where']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getCount = jest.fn().mockResolvedValue(result.count ?? 0);
  qb.getRawOne = jest.fn().mockResolvedValue(result.raw);
  return qb;
};

const profile = {
  id: 'u1',
  username: 'puly',
  email: 'puly@example.com',
  avatarUrl: null,
  role: UserRole.USER,
  createdAt: new Date('2026-01-01'),
} as User;

describe('UserProfileAssembler', () => {
  let assembler: UserProfileAssembler;
  let users: jest.Mocked<UserFinder>;
  let follows: jest.Mocked<FollowToggler>;
  let reviews: jest.Mocked<Repository<Review>>;
  let reviewLikes: jest.Mocked<Repository<ReviewLike>>;
  let comments: jest.Mocked<Repository<Comment>>;
  let alfajores: jest.Mocked<Repository<Alfajor>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserProfileAssembler,
        {
          provide: UserFinder,
          useValue: { byUsernameOrFail: jest.fn() },
        },
        {
          provide: FollowToggler,
          useValue: {
            countFollowers: jest.fn().mockResolvedValue(3),
            countFollowing: jest.fn().mockResolvedValue(2),
            followingAmong: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: getRepositoryToken(Review),
          useValue: {
            count: jest.fn().mockResolvedValue(5),
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(makeQb({ raw: { avg: '8.42' } })),
          },
        },
        {
          provide: getRepositoryToken(ReviewLike),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(makeQb({ count: 9 })),
          },
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: { count: jest.fn().mockResolvedValue(7) },
        },
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { count: jest.fn().mockResolvedValue(1) },
        },
      ],
    }).compile();

    assembler = module.get(UserProfileAssembler);
    users = module.get(UserFinder);
    follows = module.get(FollowToggler);
    reviews = module.get(getRepositoryToken(Review));
    reviewLikes = module.get(getRepositoryToken(ReviewLike));
    comments = module.get(getRepositoryToken(Comment));
    alfajores = module.get(getRepositoryToken(Alfajor));
    users.byUsernameOrFail.mockResolvedValue(profile);
  });

  it('throws NotFoundException when the username does not exist', async () => {
    users.byUsernameOrFail.mockRejectedValue(new NotFoundException());
    await expect(assembler.byUsername('ghost')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('assembles aggregates for an anonymous viewer (no email, isFollowing false)', async () => {
    const dto = await assembler.byUsername('puly');

    expect(dto).toMatchObject({
      id: 'u1',
      username: 'puly',
      followersCount: 3,
      followingCount: 2,
      reviewsCount: 5,
      isFollowing: false,
    });
    expect(dto.email).toBeUndefined();
    expect(reviews.count).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('assembles the community-contribution aggregates', async () => {
    const dto = await assembler.byUsername('puly');

    expect(dto).toMatchObject({
      commentsCount: 7,
      alfajoresAddedCount: 1,
      likesReceivedCount: 9,
      avgScore: 8.4,
    });
    expect(comments.count).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(alfajores.count).toHaveBeenCalledWith({
      where: { createdById: 'u1', status: AlfajorStatus.APPROVED },
    });
    expect(reviewLikes.createQueryBuilder).toHaveBeenCalled();
  });

  it('returns a null avgScore when the user has no reviews', async () => {
    (reviews.createQueryBuilder as jest.Mock).mockReturnValue(
      makeQb({ raw: { avg: null } }),
    );
    const dto = await assembler.byUsername('puly');
    expect(dto.avgScore).toBeNull();
  });

  it('rounds avgScore to one decimal', async () => {
    (reviews.createQueryBuilder as jest.Mock).mockReturnValue(
      makeQb({ raw: { avg: '7.0500000000000000' } }),
    );
    const dto = await assembler.byUsername('puly');
    expect(dto.avgScore).toBe(7.1);
  });

  it('reports isFollowing true when the viewer follows the profile', async () => {
    follows.followingAmong.mockResolvedValue(new Set(['u1']));
    const dto = await assembler.byUsername('puly', 'viewer');
    expect(dto.isFollowing).toBe(true);
    expect(dto.email).toBeUndefined();
  });

  it('reports isFollowing false when the viewer does not follow', async () => {
    follows.followingAmong.mockResolvedValue(new Set());
    const dto = await assembler.byUsername('puly', 'viewer');
    expect(dto.isFollowing).toBe(false);
  });

  it('exposes email and null isFollowing on the own profile', async () => {
    const dto = await assembler.byUsername('puly', 'u1');
    expect(dto.email).toBe('puly@example.com');
    expect(dto.isFollowing).toBeNull();
    expect(follows.followingAmong).not.toHaveBeenCalled();
  });
});
