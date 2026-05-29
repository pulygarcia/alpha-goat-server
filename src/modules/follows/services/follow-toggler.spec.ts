import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { User } from '../../users/domain/user.entity';
import { UserFinder } from '../../users/services/user-finder';
import { UserFollow } from '../domain/user-follow.entity';
import { FollowToggler } from './follow-toggler';

describe('FollowToggler', () => {
  let toggler: FollowToggler;
  let repo: jest.Mocked<Repository<UserFollow>>;
  let users: jest.Mocked<UserFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FollowToggler,
        {
          provide: getRepositoryToken(UserFollow),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            find: jest.fn(),
          },
        },
        { provide: UserFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();
    toggler = module.get(FollowToggler);
    repo = module.get(getRepositoryToken(UserFollow));
    users = module.get(UserFinder);
  });

  it('creates a follow when none exists', async () => {
    users.byId.mockResolvedValue({ id: 'b' } as User);
    repo.findOne.mockResolvedValue(null);
    const follow = { followerId: 'a', followingId: 'b' } as UserFollow;
    repo.create.mockReturnValue(follow);

    await toggler.follow('a', 'b');

    expect(repo.save).toHaveBeenCalledWith(follow);
  });

  it('is idempotent when already following', async () => {
    users.byId.mockResolvedValue({ id: 'b' } as User);
    repo.findOne.mockResolvedValue({ id: 'f1' } as UserFollow);

    await toggler.follow('a', 'b');

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects following yourself', async () => {
    await expect(toggler.follow('a', 'a')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(users.byId).not.toHaveBeenCalled();
  });

  it('deletes the follow on unfollow', async () => {
    await toggler.unfollow('a', 'b');
    expect(repo.delete).toHaveBeenCalledWith({
      followerId: 'a',
      followingId: 'b',
    });
  });

  it('returns the ids the user follows', async () => {
    repo.find.mockResolvedValue([
      { followingId: 'b' } as UserFollow,
      { followingId: 'c' } as UserFollow,
    ]);

    expect(await toggler.followingIds('a')).toEqual(['b', 'c']);
  });
});
