import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from '../domain/user.entity';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { UserSearcher } from './user-searcher';

describe('UserSearcher', () => {
  let searcher: UserSearcher;
  let repo: jest.Mocked<Repository<User>>;
  let follows: jest.Mocked<FollowToggler>;

  const viewerId = 'viewer-1';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserSearcher,
        {
          provide: getRepositoryToken(User),
          useValue: { findAndCount: jest.fn() },
        },
        {
          provide: FollowToggler,
          useValue: { followingAmong: jest.fn() },
        },
      ],
    }).compile();

    searcher = module.get(UserSearcher);
    repo = module.get(getRepositoryToken(User));
    follows = module.get(FollowToggler);
  });

  it('paginates and maps items with isFollowing resolved in batch', async () => {
    const u1 = { id: 'u1', username: 'ana', avatarUrl: null } as User;
    const u2 = { id: 'u2', username: 'bea', avatarUrl: 'a.png' } as User;
    repo.findAndCount.mockResolvedValue([[u1, u2], 2]);
    follows.followingAmong.mockResolvedValue(new Set(['u2']));

    const res = await searcher.execute({ page: 1, limit: 20 }, viewerId);

    expect(res).toEqual({
      items: [
        { id: 'u1', username: 'ana', avatarUrl: null, isFollowing: false },
        { id: 'u2', username: 'bea', avatarUrl: 'a.png', isFollowing: true },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
    expect(follows.followingAmong).toHaveBeenCalledWith(viewerId, ['u1', 'u2']);
  });

  it('excludes banned users and the viewer themselves from the query', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);
    follows.followingAmong.mockResolvedValue(new Set());

    await searcher.execute({ page: 1, limit: 20 }, viewerId);

    const { where } = repo.findAndCount.mock.calls[0][0] as {
      where: { banned: boolean; id: ReturnType<typeof Not> };
    };
    expect(where.banned).toBe(false);
    expect(where.id).toEqual(Not(viewerId));
  });

  it('applies an unaccent-aware ILIKE filter on username when q is provided', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);
    follows.followingAmong.mockResolvedValue(new Set());

    await searcher.execute({ q: 'nachit', page: 1, limit: 20 }, viewerId);

    const { where } = repo.findAndCount.mock.calls[0][0] as {
      where: {
        username: {
          type: string;
          objectLiteralParameters: Record<string, unknown>;
          getSql(alias: string): string;
        };
      };
    };
    expect(where.username.type).toBe('raw');
    expect(where.username.objectLiteralParameters).toEqual({
      q: '%nachit%',
    });
    expect(where.username.getSql('username')).toBe(
      'unaccent(username) ILIKE unaccent(:q)',
    );
  });

  it('does not call FollowToggler when there are no results', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    const res = await searcher.execute({ page: 1, limit: 20 }, viewerId);

    expect(res.items).toEqual([]);
    expect(follows.followingAmong).not.toHaveBeenCalled();
  });
});
