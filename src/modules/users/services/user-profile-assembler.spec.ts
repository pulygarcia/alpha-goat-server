import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { Review } from '../../reviews/domain/review.entity';
import { UserRole } from '../domain/user-role.enum';
import { User } from '../domain/user.entity';
import { UserFinder } from './user-finder';
import { UserProfileAssembler } from './user-profile-assembler';

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
          useValue: { count: jest.fn().mockResolvedValue(5) },
        },
      ],
    }).compile();

    assembler = module.get(UserProfileAssembler);
    users = module.get(UserFinder);
    follows = module.get(FollowToggler);
    reviews = module.get(getRepositoryToken(Review));
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
