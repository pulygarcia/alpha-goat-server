import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowToggler } from '../../follows/services/follow-toggler';
import { Review } from '../../reviews/domain/review.entity';
import { FeedQueryDto, FeedScope, FeedSort } from '../dto/feed-query.dto';
import { FeedFinder } from './feed-finder';

// qb chainable que registra las llamadas y resuelve getCount / getRawMany.
const makeQb = (count: number, rawRows?: unknown[]) => {
  const qb: any = {};
  const chain = [
    'innerJoin', 'select', 'where', 'andWhere', 'addSelect',
    'orderBy', 'addOrderBy', 'offset', 'limit',
  ];
  for (const m of chain) qb[m] = jest.fn().mockReturnValue(qb);
  qb.getCount = jest.fn().mockResolvedValue(count);
  qb.getRawMany = jest.fn().mockResolvedValue(rawRows);
  return qb;
};

const baseDto = (over: Partial<FeedQueryDto> = {}): FeedQueryDto => ({
  sort: FeedSort.RECENT,
  page: 1,
  limit: 20,
  ...over,
});

describe('FeedFinder', () => {
  let finder: FeedFinder;
  let reviews: { createQueryBuilder: jest.Mock; find: jest.Mock };
  let follows: jest.Mocked<Pick<FollowToggler, 'followingIds'>>;

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn(), find: jest.fn() };
    follows = { followingIds: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        FeedFinder,
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: FollowToggler, useValue: follows },
      ],
    }).compile();

    finder = module.get(FeedFinder);
  });

  it('rejects scope=province without a province', async () => {
    await expect(
      finder.execute(baseDto({ scope: FeedScope.PROVINCE }), 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(reviews.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns an empty page for scope=following when the user follows nobody', async () => {
    follows.followingIds.mockResolvedValue([]);

    const result = await finder.execute(baseDto({ scope: FeedScope.FOLLOWING }), 'u1');

    expect(result).toEqual({ rows: [], total: 0, page: 1, limit: 20 });
    expect(reviews.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('short-circuits the data query when total is zero', async () => {
    reviews.createQueryBuilder.mockReturnValueOnce(makeQb(0));

    const result = await finder.execute(baseDto(), 'u1');

    expect(result).toEqual({ rows: [], total: 0, page: 1, limit: 20 });
    expect(reviews.createQueryBuilder).toHaveBeenCalledTimes(1); // solo el count
  });

  it('maps rows with numeric like and comment counts, preserving rank order', async () => {
    const review = { id: 'r1', comentario: 'rico', ratingGeneral: 8 } as Review;
    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(1)) // count
      .mockReturnValueOnce(makeQb(1, [{ id: 'r1', likesCount: '12', commentsCount: '3' }])); // ranked ids
    reviews.find.mockResolvedValue([review]);

    const result = await finder.execute(baseDto(), 'u1');

    expect(result.total).toBe(1);
    expect(result.rows).toEqual([{ review, likes: 12, commentsCount: 3 }]);
  });

  it('reorders the loaded entities to match the ranked ids', async () => {
    const r1 = { id: 'r1' } as Review;
    const r2 = { id: 'r2' } as Review;
    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(2))
      .mockReturnValueOnce(
        makeQb(2, [
          { id: 'r2', likesCount: '9', commentsCount: '0' },
          { id: 'r1', likesCount: '4', commentsCount: '0' },
        ]),
      );
    // find devuelve en orden arbitrario; el finder debe respetar el rank (r2, r1).
    reviews.find.mockResolvedValue([r1, r2]);

    const result = await finder.execute(baseDto({ sort: FeedSort.LIKES }), 'u1');

    expect(result.rows.map((row) => row.review.id)).toEqual(['r2', 'r1']);
  });

  it('filters by the followed ids for scope=following', async () => {
    follows.followingIds.mockResolvedValue(['a', 'b']);
    const countQb = makeQb(1);
    const rankedQb = makeQb(1, [{ id: 'r1', likesCount: '0', commentsCount: '0' }]);
    reviews.createQueryBuilder.mockReturnValueOnce(countQb).mockReturnValueOnce(rankedQb);
    reviews.find.mockResolvedValue([{ id: 'r1' } as Review]);

    await finder.execute(baseDto({ scope: FeedScope.FOLLOWING }), 'u1');

    const inCall = countQb.andWhere.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('IN'),
    );
    expect(inCall![1]).toEqual({ followingIds: ['a', 'b'] });
  });

  it('orders by likesCount for sort=likes', async () => {
    const countQb = makeQb(1);
    const rankedQb = makeQb(1, [{ id: 'r1', likesCount: '5', commentsCount: '1' }]);
    reviews.createQueryBuilder.mockReturnValueOnce(countQb).mockReturnValueOnce(rankedQb);
    reviews.find.mockResolvedValue([{ id: 'r1' } as Review]);

    await finder.execute(baseDto({ sort: FeedSort.LIKES }), 'u1');

    expect(rankedQb.orderBy).toHaveBeenCalledWith('"likesCount"', 'DESC');
  });

  it('applies offset and limit from page/limit', async () => {
    const countQb = makeQb(50);
    const rankedQb = makeQb(50, []);
    reviews.createQueryBuilder.mockReturnValueOnce(countQb).mockReturnValueOnce(rankedQb);
    reviews.find.mockResolvedValue([]);

    await finder.execute(baseDto({ page: 3, limit: 10 }), 'u1');

    expect(rankedQb.offset).toHaveBeenCalledWith(20); // (3-1)*10
    expect(rankedQb.limit).toHaveBeenCalledWith(10);
  });
});
