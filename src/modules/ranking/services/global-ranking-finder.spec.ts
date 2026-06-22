import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { GlobalRankingFinder } from './global-ranking-finder';

// QueryBuilder encadenable que resuelve `getRawMany` con `raw`.
const makeQb = (raw: unknown) => {
  const qb: any = {};
  const chain = [
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'groupBy',
    'having',
    'orderBy',
    'addOrderBy',
    'offset',
    'limit',
  ];
  for (const m of chain) qb[m] = jest.fn().mockReturnValue(qb);
  qb.getRawMany = jest.fn().mockResolvedValue(raw);
  return qb;
};

const alfajor = (id: string) =>
  ({
    id,
    nombre: id,
    tipo: 'CLASICO',
    marca: { id: `marca-${id}` },
  }) as unknown as Alfajor;

describe('GlobalRankingFinder', () => {
  let finder: GlobalRankingFinder;
  let reviews: { createQueryBuilder: jest.Mock };
  let alfajores: { find: jest.Mock };

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn() };
    alfajores = { find: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GlobalRankingFinder,
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: getRepositoryToken(Alfajor), useValue: alfajores },
      ],
    }).compile();

    finder = module.get(GlobalRankingFinder);
  });

  // El finder llama `createQueryBuilder` dos veces: primero el count, luego la
  // página. `count` por defecto refleja los mismos ids que `rank`.
  const wire = (opts: {
    rank: Array<{ alfajorId: string; score: string; reviewsCount: string }>;
    count?: Array<{ alfajorId: string }>;
    found?: Alfajor[];
  }) => {
    const countQb = makeQb(
      opts.count ?? opts.rank.map((r) => ({ alfajorId: r.alfajorId })),
    );
    const pageQb = makeQb(opts.rank);
    reviews.createQueryBuilder
      .mockReturnValueOnce(countQb)
      .mockReturnValueOnce(pageQb);
    alfajores.find.mockResolvedValue(
      opts.found ?? opts.rank.map((r) => alfajor(r.alfajorId)),
    );
    return { countQb, pageQb };
  };

  it('orders by score desc, then reviewsCount desc, then id asc, and preserves that order after hydration', async () => {
    const { pageQb } = wire({
      rank: [
        { alfajorId: 'a1', score: '8.5', reviewsCount: '40' },
        { alfajorId: 'a2', score: '7.2', reviewsCount: '12' },
      ],
      // El find devuelve en otro orden a propósito.
      found: [alfajor('a2'), alfajor('a1')],
    });

    const { rows } = await finder.execute();

    expect(rows.map((r) => r.alfajor.id)).toEqual(['a1', 'a2']);
    expect(pageQb.orderBy).toHaveBeenCalledWith('"score"', 'DESC');
    expect(pageQb.addOrderBy).toHaveBeenCalledWith('"reviewsCount"', 'DESC');
    expect(pageQb.addOrderBy).toHaveBeenCalledWith('a.id', 'ASC');
  });

  it('rounds the score to 2 decimals', async () => {
    wire({
      rank: [{ alfajorId: 'a1', score: '8.3333333', reviewsCount: '5' }],
    });
    const { rows } = await finder.execute();
    expect(rows[0].score).toBe(8.33);
  });

  it('exposes reviewsCount as a number', async () => {
    wire({ rank: [{ alfajorId: 'a1', score: '8', reviewsCount: '17' }] });
    const { rows } = await finder.execute();
    expect(rows[0].reviewsCount).toBe(17);
  });

  it('only considers reviews of APPROVED alfajores', async () => {
    const { pageQb } = wire({
      rank: [{ alfajorId: 'a1', score: '8', reviewsCount: '5' }],
    });
    await finder.execute();
    expect(pageQb.where).toHaveBeenCalledWith('a.status = :status', {
      status: AlfajorStatus.APPROVED,
    });
  });

  it('applies the minimum-sample guard (HAVING COUNT(*) >= 5)', async () => {
    const { pageQb } = wire({
      rank: [{ alfajorId: 'a1', score: '8', reviewsCount: '5' }],
    });
    await finder.execute();
    expect(pageQb.having).toHaveBeenCalledWith('COUNT(*) >= :min', { min: 5 });
  });

  it('paginates with offset = (page - 1) * limit and the requested limit', async () => {
    const { pageQb } = wire({
      rank: [{ alfajorId: 'a1', score: '8', reviewsCount: '5' }],
    });
    await finder.execute(2, 20);
    expect(pageQb.offset).toHaveBeenCalledWith(20);
    expect(pageQb.limit).toHaveBeenCalledWith(20);
  });

  it('returns the total number of qualifying alfajores', async () => {
    wire({
      rank: [
        { alfajorId: 'a1', score: '9', reviewsCount: '10' },
        { alfajorId: 'a2', score: '8', reviewsCount: '8' },
      ],
      count: [{ alfajorId: 'a1' }, { alfajorId: 'a2' }, { alfajorId: 'a3' }],
    });
    const { total } = await finder.execute();
    expect(total).toBe(3);
  });

  it('returns empty with total 0 when nothing qualifies, without hydrating', async () => {
    wire({ rank: [], count: [] });
    const result = await finder.execute();
    expect(result).toEqual({ rows: [], total: 0, page: 1, limit: 20 });
    expect(alfajores.find).not.toHaveBeenCalled();
  });

  it('returns an empty page (without hydrating) when the offset is past the last result', async () => {
    // 3 alfajores califican pero la página pedida queda fuera de rango.
    wire({
      rank: [],
      count: [{ alfajorId: 'a1' }, { alfajorId: 'a2' }, { alfajorId: 'a3' }],
    });
    const result = await finder.execute(99, 20);
    expect(result).toEqual({ rows: [], total: 3, page: 99, limit: 20 });
    expect(alfajores.find).not.toHaveBeenCalled();
  });

  it('hydrates alfajores with their marca relation', async () => {
    wire({ rank: [{ alfajorId: 'a1', score: '8', reviewsCount: '5' }] });
    await finder.execute();
    expect(alfajores.find).toHaveBeenCalledWith(
      expect.objectContaining({ relations: ['marca'] }),
    );
  });

  it('skips a ranked alfajor whose entity is no longer found', async () => {
    wire({
      rank: [{ alfajorId: 'gone', score: '8', reviewsCount: '5' }],
      found: [],
    });
    const { rows } = await finder.execute();
    expect(rows).toEqual([]);
  });

  it('defaults to page 1, limit 20 when omitted', async () => {
    const { pageQb } = wire({
      rank: [{ alfajorId: 'a1', score: '8', reviewsCount: '5' }],
    });
    const { page, limit } = await finder.execute();
    expect(page).toBe(1);
    expect(limit).toBe(20);
    expect(pageQb.offset).toHaveBeenCalledWith(0);
    expect(pageQb.limit).toHaveBeenCalledWith(20);
  });
});
