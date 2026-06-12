import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { WeeklyRankingFinder } from './weekly-ranking-finder';

// QueryBuilder encadenable que resuelve `getRawMany` con `raw`.
const makeQb = (raw: unknown) => {
  const qb: any = {};
  const chain = [
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'setParameter',
    'groupBy',
    'having',
    'orderBy',
    'limit',
  ];
  for (const m of chain) qb[m] = jest.fn().mockReturnValue(qb);
  qb.getRawMany = jest.fn().mockResolvedValue(raw);
  return qb;
};

const alfajor = (id: string) =>
  ({ id, nombre: id, marca: { id: `marca-${id}` } }) as unknown as Alfajor;

const NOW = new Date('2026-06-12T12:00:00Z');

describe('WeeklyRankingFinder', () => {
  let finder: WeeklyRankingFinder;
  let reviews: { createQueryBuilder: jest.Mock };
  let alfajores: { find: jest.Mock };

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn() };
    alfajores = { find: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        WeeklyRankingFinder,
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: getRepositoryToken(Alfajor), useValue: alfajores },
      ],
    }).compile();

    finder = module.get(WeeklyRankingFinder);
  });

  const wire = (opts: {
    rank: Array<{ alfajorId: string; score: string; prevScore: string | null }>;
    found?: Alfajor[];
  }) => {
    const qb = makeQb(opts.rank);
    reviews.createQueryBuilder.mockReturnValue(qb);
    alfajores.find.mockResolvedValue(
      opts.found ?? opts.rank.map((r) => alfajor(r.alfajorId)),
    );
    return qb;
  };

  it('orders by weekly score desc and preserves that order after hydration', async () => {
    const qb = wire({
      rank: [
        { alfajorId: 'a1', score: '8.5', prevScore: '8.0' },
        { alfajorId: 'a2', score: '7.2', prevScore: '7.9' },
      ],
      // El find devuelve en otro orden a propósito.
      found: [alfajor('a2'), alfajor('a1')],
    });

    const rows = await finder.execute(NOW);

    expect(rows.map((r) => r.alfajor.id)).toEqual(['a1', 'a2']);
    expect(qb.orderBy).toHaveBeenCalledWith('"score"', 'DESC');
  });

  it('rounds the score to 2 decimals', async () => {
    wire({ rank: [{ alfajorId: 'a1', score: '8.3333333', prevScore: null }] });
    const [row] = await finder.execute(NOW);
    expect(row.score).toBe(8.33);
  });

  it('only considers reviews of APPROVED alfajores', async () => {
    const qb = wire({
      rank: [{ alfajorId: 'a1', score: '8', prevScore: null }],
    });
    await finder.execute(NOW);
    expect(qb.where).toHaveBeenCalledWith('a.status = :status', {
      status: AlfajorStatus.APPROVED,
    });
  });

  it('applies the minimum-sample guard on the current window (HAVING >= 3)', async () => {
    const qb = wire({
      rank: [{ alfajorId: 'a1', score: '8', prevScore: null }],
    });
    await finder.execute(NOW);
    expect(qb.having).toHaveBeenCalledWith(
      'COUNT(*) FILTER (WHERE r.createdAt >= :weekAgo) >= :min',
      { min: 3 },
    );
  });

  it('bounds the query to a 14-day window and splits it at 7 days', async () => {
    const qb = wire({
      rank: [{ alfajorId: 'a1', score: '8', prevScore: null }],
    });

    await finder.execute(NOW);

    const windowCall = qb.andWhere.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('createdAt'),
    );
    expect(windowCall).toBeDefined();
    const { twoWeeksAgo } = windowCall![1];
    expect(NOW.getTime() - twoWeeksAgo.getTime()).toBe(
      14 * 24 * 60 * 60 * 1000,
    );

    const splitCall = qb.setParameter.mock.calls.find(
      (c: any[]) => c[0] === 'weekAgo',
    );
    expect(splitCall).toBeDefined();
    expect(NOW.getTime() - splitCall![1].getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  describe('trend', () => {
    const trendFor = async (score: string, prevScore: string | null) => {
      wire({ rank: [{ alfajorId: 'a1', score, prevScore }] });
      const [row] = await finder.execute(NOW);
      return row.trend;
    };

    it('is `up` when the current average is higher', async () => {
      expect(await trendFor('8.5', '7.0')).toBe('up');
    });

    it('is `down` when the current average is lower', async () => {
      expect(await trendFor('8.0', '9.0')).toBe('down');
    });

    it('is `new` when there is no previous-window sample', async () => {
      expect(await trendFor('8.0', null)).toBe('new');
    });

    it('is `same` when both averages round to the same 2 decimals', async () => {
      expect(await trendFor('8.0040', '8.0044')).toBe('same');
    });
  });

  it('returns an empty array when no alfajor qualifies', async () => {
    wire({ rank: [] });
    const rows = await finder.execute(NOW);
    expect(rows).toEqual([]);
    // Sin candidatos no hidrata nada.
    expect(alfajores.find).not.toHaveBeenCalled();
  });

  it('respects the requested limit', async () => {
    const qb = wire({
      rank: [{ alfajorId: 'a1', score: '8', prevScore: null }],
    });
    await finder.execute(NOW, 3);
    expect(qb.limit).toHaveBeenCalledWith(3);
  });

  it('hydrates alfajores with their marca relation', async () => {
    wire({ rank: [{ alfajorId: 'a1', score: '8', prevScore: null }] });
    await finder.execute(NOW);
    expect(alfajores.find).toHaveBeenCalledWith(
      expect.objectContaining({ relations: ['marca'] }),
    );
  });

  it('skips a ranked alfajor whose entity is no longer found', async () => {
    wire({
      rank: [{ alfajorId: 'gone', score: '8', prevScore: null }],
      found: [],
    });
    const rows = await finder.execute(NOW);
    expect(rows).toEqual([]);
  });

  it('defaults `now` to the current time when omitted', async () => {
    wire({ rank: [{ alfajorId: 'a1', score: '8', prevScore: null }] });
    const rows = await finder.execute();
    expect(rows.map((r) => r.alfajor.id)).toEqual(['a1']);
  });
});
