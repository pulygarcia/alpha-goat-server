import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { FeedStatsFinder } from './feed-stats-finder';

describe('FeedStatsFinder', () => {
  let finder: FeedStatsFinder;
  let reviews: { createQueryBuilder: jest.Mock };

  const makeQb = (count: number) => {
    const qb: any = {};
    for (const m of ['innerJoin', 'where', 'andWhere'])
      qb[m] = jest.fn().mockReturnValue(qb);
    qb.getCount = jest.fn().mockResolvedValue(count);
    return qb;
  };

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        FeedStatsFinder,
        { provide: getRepositoryToken(Review), useValue: reviews },
      ],
    }).compile();

    finder = module.get(FeedStatsFinder);
  });

  it('returns today and week counts', async () => {
    // Promise.all dispara today primero, week después (orden del array).
    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(3)) // hoy
      .mockReturnValueOnce(makeQb(12)); // semana

    const result = await finder.execute(new Date('2026-05-25T12:00:00Z'));

    expect(result).toEqual({ todayCount: 3, weekCount: 12 });
  });

  it('counts "today" from the start of the local day', async () => {
    const now = new Date('2026-05-25T12:00:00Z');
    const todayQb = makeQb(0);
    reviews.createQueryBuilder
      .mockReturnValueOnce(todayQb)
      .mockReturnValueOnce(makeQb(0));

    await finder.execute(now);

    const call = todayQb.andWhere.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('createdAt'),
    );
    expect(call).toBeDefined();
    const expected = new Date(now);
    expected.setHours(0, 0, 0, 0);
    expect(call![1].from).toEqual(expected);
  });

  it('counts "week" from a rolling 7-day window', async () => {
    const now = new Date('2026-05-25T12:00:00Z');
    const weekQb = makeQb(0);
    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(0))
      .mockReturnValueOnce(weekQb);

    await finder.execute(now);

    const call = weekQb.andWhere.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('createdAt'),
    );
    expect(call).toBeDefined();
    expect(now.getTime() - call![1].from.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it('only counts reviews of APPROVED alfajores', async () => {
    const todayQb = makeQb(0);
    reviews.createQueryBuilder
      .mockReturnValueOnce(todayQb)
      .mockReturnValueOnce(makeQb(0));

    await finder.execute(new Date('2026-05-25T12:00:00Z'));

    const call = todayQb.where.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('status'),
    );
    expect(call).toBeDefined();
    expect(call![1]).toEqual({ status: AlfajorStatus.APPROVED });
  });
});
