import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { WorstRankedFinder } from './worst-ranked-finder';

// QueryBuilder encadenable que resuelve `getRawOne` con `raw`.
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
    'limit',
  ];
  for (const m of chain) qb[m] = jest.fn().mockReturnValue(qb);
  qb.getRawOne = jest.fn().mockResolvedValue(raw);
  return qb;
};

const alfajor = (id: string) =>
  ({
    id,
    nombre: id,
    tipo: 'CLASICO',
    marca: { id: `marca-${id}` },
  }) as unknown as Alfajor;

describe('WorstRankedFinder', () => {
  let finder: WorstRankedFinder;
  let reviews: { createQueryBuilder: jest.Mock };
  let alfajores: { findOne: jest.Mock };

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn() };
    alfajores = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        WorstRankedFinder,
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: getRepositoryToken(Alfajor), useValue: alfajores },
      ],
    }).compile();

    finder = module.get(WorstRankedFinder);
  });

  const wire = (opts: {
    raw: { alfajorId: string; score: string; reviewsCount: string } | undefined;
    found?: Alfajor | null;
  }) => {
    const qb = makeQb(opts.raw);
    reviews.createQueryBuilder.mockReturnValue(qb);
    alfajores.findOne.mockResolvedValue(
      opts.found !== undefined
        ? opts.found
        : opts.raw
          ? alfajor(opts.raw.alfajorId)
          : null,
    );
    return qb;
  };

  it('returns the single worst alfajor with score and reviewsCount as numbers', async () => {
    wire({ raw: { alfajorId: 'a1', score: '2.3333333', reviewsCount: '7' } });

    const row = await finder.execute();

    expect(row?.alfajor.id).toBe('a1');
    expect(row?.score).toBe(2.33);
    expect(row?.reviewsCount).toBe(7);
  });

  it('orders by score asc (worst first) with deterministic tie-breaks and limit 1', async () => {
    const qb = wire({
      raw: { alfajorId: 'a1', score: '2', reviewsCount: '5' },
    });

    await finder.execute();

    expect(qb.orderBy).toHaveBeenCalledWith('"score"', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('"reviewsCount"', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('a.id', 'ASC');
    expect(qb.limit).toHaveBeenCalledWith(1);
  });

  it('only considers reviews of APPROVED alfajores', async () => {
    const qb = wire({
      raw: { alfajorId: 'a1', score: '2', reviewsCount: '5' },
    });

    await finder.execute();

    expect(qb.where).toHaveBeenCalledWith('a.status = :status', {
      status: AlfajorStatus.APPROVED,
    });
  });

  it('applies the minimum-sample guard (HAVING COUNT(*) >= 5)', async () => {
    const qb = wire({
      raw: { alfajorId: 'a1', score: '2', reviewsCount: '5' },
    });

    await finder.execute();

    expect(qb.having).toHaveBeenCalledWith('COUNT(*) >= :min', { min: 5 });
  });

  it('hydrates the alfajor with its marca relation', async () => {
    wire({ raw: { alfajorId: 'a1', score: '2', reviewsCount: '5' } });

    await finder.execute();

    expect(alfajores.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        relations: ['marca'],
      }),
    );
  });

  it('returns null when no alfajor qualifies, without hydrating', async () => {
    wire({ raw: undefined });

    const row = await finder.execute();

    expect(row).toBeNull();
    expect(alfajores.findOne).not.toHaveBeenCalled();
  });

  it('returns null when the ranked alfajor entity is no longer found', async () => {
    wire({
      raw: { alfajorId: 'gone', score: '2', reviewsCount: '5' },
      found: null,
    });

    const row = await finder.execute();

    expect(row).toBeNull();
  });
});
