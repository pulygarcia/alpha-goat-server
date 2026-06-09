import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { Marca } from '../domain/marca.entity';
import { MarcaFeaturedFinder } from './marca-featured-finder';

// QueryBuilder encadenable que resuelve `getRawMany` con `raw`.
const makeQb = (raw: unknown) => {
  const qb: any = {};
  const chain = [
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
    'having',
    'orderBy',
    'limit',
  ];
  for (const m of chain) qb[m] = jest.fn().mockReturnValue(qb);
  qb.getRawMany = jest.fn().mockResolvedValue(raw);
  return qb;
};

const marca = (id: string) => ({ id, nombre: id }) as Marca;

describe('MarcaFeaturedFinder', () => {
  let finder: MarcaFeaturedFinder;
  let reviews: { createQueryBuilder: jest.Mock };
  let alfajores: { createQueryBuilder: jest.Mock };
  let marcas: { find: jest.Mock };

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn() };
    alfajores = { createQueryBuilder: jest.fn() };
    marcas = { find: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MarcaFeaturedFinder,
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: getRepositoryToken(Alfajor), useValue: alfajores },
        { provide: getRepositoryToken(Marca), useValue: marcas },
      ],
    }).compile();

    finder = module.get(MarcaFeaturedFinder);
  });

  // Encola los 2 query builders de reviews (rank + avgScore) y el de alfajores
  // (productCount), más el find de marcas.
  const wire = (opts: {
    rank: Array<{ marcaId: string }>;
    products?: Array<{ marcaId: string; productCount: string }>;
    scores?: Array<{ marcaId: string; avgScore: string | null }>;
    found?: Marca[];
  }) => {
    const rankQb = makeQb(opts.rank);
    const avgQb = makeQb(opts.scores ?? []);
    reviews.createQueryBuilder
      .mockReturnValueOnce(rankQb) // rankByControversy
      .mockReturnValueOnce(avgQb); // avgScoreByMarca
    alfajores.createQueryBuilder.mockReturnValue(makeQb(opts.products ?? []));
    marcas.find.mockResolvedValue(
      opts.found ?? opts.rank.map((r) => marca(r.marcaId)),
    );
    return { rankQb, avgQb };
  };

  it('ranks by controversy desc and preserves that order after hydration', async () => {
    // El SQL devuelve mB (más dividida) antes que mA (consenso).
    const { rankQb } = wire({
      rank: [{ marcaId: 'mB' }, { marcaId: 'mA' }],
      products: [
        { marcaId: 'mA', productCount: '3' },
        { marcaId: 'mB', productCount: '5' },
      ],
      scores: [
        { marcaId: 'mA', avgScore: '9.2' },
        { marcaId: 'mB', avgScore: '4.6' },
      ],
    });

    const rows = await finder.execute(new Date('2026-05-25T12:00:00Z'));

    expect(rows.map((r) => r.marca.id)).toEqual(['mB', 'mA']);
    expect(rankQb.orderBy).toHaveBeenCalledWith('"controversy"', 'DESC');
  });

  it('applies the minimum-sample guard (HAVING count >= 5)', async () => {
    const { rankQb } = wire({ rank: [{ marcaId: 'm1' }] });
    await finder.execute(new Date('2026-05-25T12:00:00Z'));
    expect(rankQb.having).toHaveBeenCalledWith('COUNT(*) >= :min', { min: 5 });
  });

  it('only considers reviews of APPROVED alfajores when ranking', async () => {
    const { rankQb } = wire({ rank: [{ marcaId: 'm1' }] });
    await finder.execute(new Date('2026-05-25T12:00:00Z'));
    expect(rankQb.where).toHaveBeenCalledWith('a.status = :status', {
      status: AlfajorStatus.APPROVED,
    });
  });

  it('uses a 30-day window ending at the given `now`', async () => {
    const now = new Date('2026-05-25T12:00:00Z');
    const { rankQb } = wire({ rank: [{ marcaId: 'm1' }] });

    await finder.execute(now);

    const windowCall = rankQb.andWhere.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('createdAt'),
    );
    expect(windowCall).toBeDefined();
    const { from } = windowCall![1];
    expect(now.getTime() - from.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('returns an empty array when no brand qualifies', async () => {
    wire({ rank: [] });
    const rows = await finder.execute(new Date('2026-05-25T12:00:00Z'));
    expect(rows).toEqual([]);
    // Sin candidatos no hidrata nada.
    expect(marcas.find).not.toHaveBeenCalled();
  });

  it('respects the requested limit', async () => {
    const { rankQb } = wire({ rank: [{ marcaId: 'm1' }] });
    await finder.execute(new Date('2026-05-25T12:00:00Z'), 3);
    expect(rankQb.limit).toHaveBeenCalledWith(3);
  });

  it('maps productCount and avgScore onto the right marca', async () => {
    wire({
      rank: [{ marcaId: 'm1' }],
      products: [{ marcaId: 'm1', productCount: '7' }],
      scores: [{ marcaId: 'm1', avgScore: '6.25' }],
    });

    const [row] = await finder.execute(new Date('2026-05-25T12:00:00Z'));

    expect(row.productCount).toBe(7);
    expect(row.avgScore).toBe(6.25);
  });

  it('defaults productCount/avgScore to 0 when display data is missing', async () => {
    wire({ rank: [{ marcaId: 'm1' }], products: [], scores: [] });
    const [row] = await finder.execute(new Date('2026-05-25T12:00:00Z'));
    expect(row.productCount).toBe(0);
    expect(row.avgScore).toBe(0);
  });

  it('treats a null avgScore as 0', async () => {
    wire({
      rank: [{ marcaId: 'm1' }],
      scores: [{ marcaId: 'm1', avgScore: null }],
    });
    const [row] = await finder.execute(new Date('2026-05-25T12:00:00Z'));
    expect(row.avgScore).toBe(0);
  });

  it('skips a ranked brand whose entity is no longer found', async () => {
    wire({ rank: [{ marcaId: 'gone' }], found: [] });
    const rows = await finder.execute(new Date('2026-05-25T12:00:00Z'));
    expect(rows).toEqual([]);
  });

  it('defaults `now` to the current time when omitted', async () => {
    wire({ rank: [{ marcaId: 'm1' }] });
    const rows = await finder.execute();
    expect(rows.map((r) => r.marca.id)).toEqual(['m1']);
  });
});
