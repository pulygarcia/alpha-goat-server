import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { Review } from '../domain/review.entity';
import { ReviewSearcher } from './review-searcher';

// qb chainable que registra llamadas y resuelve getCount / getRawMany.
const makeQb = (count: number, rawRows?: unknown[]) => {
  const qb: any = {};
  for (const m of [
    'select',
    'addSelect',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'offset',
    'limit',
  ]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getCount = jest.fn().mockResolvedValue(count);
  qb.getRawMany = jest.fn().mockResolvedValue(rawRows);
  return qb;
};

const dto = (over = {}) => ({ page: 1, limit: 20, ...over }) as never;

describe('ReviewSearcher', () => {
  let searcher: ReviewSearcher;
  let reviews: { createQueryBuilder: jest.Mock; find: jest.Mock };
  let follows: jest.Mocked<Pick<FollowToggler, 'followingAmong'>>;

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn(), find: jest.fn() };
    follows = { followingAmong: jest.fn().mockResolvedValue(new Set()) };

    const module = await Test.createTestingModule({
      providers: [
        ReviewSearcher,
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: FollowToggler, useValue: follows },
      ],
    }).compile();

    searcher = module.get(ReviewSearcher);
  });

  it('short-circuits when total is zero', async () => {
    reviews.createQueryBuilder.mockReturnValueOnce(makeQb(0));

    const res = await searcher.execute(dto({ alfajorId: 'a1' }));

    expect(res).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    expect(reviews.createQueryBuilder).toHaveBeenCalledTimes(1); // solo el count
  });

  it('maps rows with numeric like and comment counts', async () => {
    const review = { id: 'r1', userId: 'u2' } as Review;
    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(1)) // count
      .mockReturnValueOnce(
        makeQb(1, [{ id: 'r1', likesCount: '12', commentsCount: '3' }]),
      ); // ranked
    reviews.find.mockResolvedValue([review]);

    const res = await searcher.execute(dto({ alfajorId: 'a1' }));

    expect(res.total).toBe(1);
    expect(res.items).toEqual([
      { review, likesCount: 12, commentsCount: 3, isFollowing: false },
    ]);
  });

  it('filters by alfajorId on the count query', async () => {
    const countQb = makeQb(0);
    reviews.createQueryBuilder.mockReturnValueOnce(countQb);

    await searcher.execute(dto({ alfajorId: 'a1' }));

    expect(countQb.andWhere).toHaveBeenCalledWith('r.alfajorId = :alfajorId', {
      alfajorId: 'a1',
    });
  });

  it('applies offset and limit from page/limit', async () => {
    const countQb = makeQb(50);
    const rankedQb = makeQb(50, []);
    reviews.createQueryBuilder
      .mockReturnValueOnce(countQb)
      .mockReturnValueOnce(rankedQb);
    reviews.find.mockResolvedValue([]);

    await searcher.execute(dto({ page: 3, limit: 10 }));

    expect(rankedQb.offset).toHaveBeenCalledWith(20); // (3-1)*10
    expect(rankedQb.limit).toHaveBeenCalledWith(10);
  });

  it('resolves isFollowing against the current user for the page authors', async () => {
    const r1 = { id: 'r1', userId: 'a1' } as Review;
    const r2 = { id: 'r2', userId: 'a2' } as Review;
    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(2))
      .mockReturnValueOnce(
        makeQb(2, [
          { id: 'r1', likesCount: '0', commentsCount: '0' },
          { id: 'r2', likesCount: '0', commentsCount: '0' },
        ]),
      );
    reviews.find.mockResolvedValue([r1, r2]);
    follows.followingAmong.mockResolvedValue(new Set(['a1']));

    const res = await searcher.execute(dto({ alfajorId: 'a1' }), 'me');

    expect(follows.followingAmong).toHaveBeenCalledWith('me', ['a1', 'a2']);
    expect(res.items.map((row) => row.isFollowing)).toEqual([true, false]);
  });

  it('skips the follow lookup for anonymous requests', async () => {
    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(1))
      .mockReturnValueOnce(
        makeQb(1, [{ id: 'r1', likesCount: '0', commentsCount: '0' }]),
      );
    reviews.find.mockResolvedValue([{ id: 'r1', userId: 'a1' } as Review]);

    await searcher.execute(dto({ alfajorId: 'a1' }));

    expect(follows.followingAmong).not.toHaveBeenCalled();
  });
});
