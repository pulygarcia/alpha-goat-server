import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { RecommendationFinder } from './recommendation-finder';
import { AxisVector, UserTasteFingerprint } from './user-taste-fingerprint';

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
  ];
  for (const m of chain) qb[m] = jest.fn().mockReturnValue(qb);
  qb.getRawMany = jest.fn().mockResolvedValue(raw);
  return qb;
};

type RawOver = Partial<{
  alfajorId: string;
  dulzor: number;
  cantidadDDL: number;
  calidadBano: number;
  ratioTapaRelleno: number;
  textura: number;
  avgGeneral: number;
}>;

// Perfil crudo (pg devuelve los AVG como string).
const candidate = (id: string, over: RawOver = {}) => {
  const v = {
    alfajorId: id,
    dulzor: 5,
    cantidadDDL: 5,
    calidadBano: 5,
    ratioTapaRelleno: 5,
    textura: 5,
    avgGeneral: 8,
    ...over,
  };
  return {
    alfajorId: v.alfajorId,
    dulzor: String(v.dulzor),
    cantidadDDL: String(v.cantidadDDL),
    calidadBano: String(v.calidadBano),
    ratioTapaRelleno: String(v.ratioTapaRelleno),
    textura: String(v.textura),
    avgGeneral: String(v.avgGeneral),
  };
};

const alfajor = (id: string) =>
  ({
    id,
    nombre: id,
    tipo: 'CLASICO',
    marca: { id: `marca-${id}` },
  }) as unknown as Alfajor;

describe('RecommendationFinder', () => {
  let finder: RecommendationFinder;
  let reviews: { createQueryBuilder: jest.Mock };
  let alfajores: { find: jest.Mock };
  let fingerprint: { build: jest.Mock };

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn() };
    alfajores = { find: jest.fn() };
    fingerprint = { build: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RecommendationFinder,
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: getRepositoryToken(Alfajor), useValue: alfajores },
        { provide: UserTasteFingerprint, useValue: fingerprint },
      ],
    }).compile();

    finder = module.get(RecommendationFinder);
  });

  const wire = (opts: {
    taste: AxisVector | null;
    candidates: ReturnType<typeof candidate>[];
    found?: Alfajor[];
  }) => {
    fingerprint.build.mockResolvedValue(opts.taste);
    const qb = makeQb(opts.candidates);
    reviews.createQueryBuilder.mockReturnValue(qb);
    alfajores.find.mockResolvedValue(
      opts.found ?? opts.candidates.map((c) => alfajor(c.alfajorId)),
    );
    return qb;
  };

  const taste = (over: Partial<AxisVector> = {}): AxisVector => ({
    dulzor: 5,
    cantidadDDL: 5,
    calidadBano: 5,
    ratioTapaRelleno: 5,
    textura: 5,
    ...over,
  });

  it('returns an empty array when there are no candidates', async () => {
    wire({ taste: taste(), candidates: [] });
    const rows = await finder.execute('u1');
    expect(rows).toEqual([]);
    expect(alfajores.find).not.toHaveBeenCalled();
  });

  it('only considers APPROVED alfajores and applies the min-sample guard', async () => {
    const qb = wire({ taste: taste(), candidates: [candidate('a1')] });
    await finder.execute('u1');
    expect(qb.where).toHaveBeenCalledWith('a.status = :status', {
      status: AlfajorStatus.APPROVED,
    });
    expect(qb.having).toHaveBeenCalledWith('COUNT(*) >= :min', { min: 3 });
  });

  it("excludes the user's already-reviewed alfajores", async () => {
    const qb = wire({ taste: taste(), candidates: [candidate('a1')] });
    await finder.execute('u1');
    const notInCall = qb.andWhere.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('NOT IN'),
    );
    expect(notInCall).toBeDefined();
    expect(notInCall![1]).toEqual({ userId: 'u1' });
  });

  it('scores a proportional profile at matchPct ~100', async () => {
    // huella y perfil con la misma forma (dulzor dominante) → coseno 1.
    wire({
      taste: taste({
        dulzor: 10,
        cantidadDDL: 0,
        calidadBano: 0,
        ratioTapaRelleno: 0,
        textura: 0,
      }),
      candidates: [
        candidate('a1', {
          dulzor: 5,
          cantidadDDL: 0,
          calidadBano: 0,
          ratioTapaRelleno: 0,
          textura: 0,
          avgGeneral: 8,
        }),
      ],
    });
    const [row] = await finder.execute('u1');
    expect(row.matchPct).toBe(100);
    // score = 0.7*100 + 0.3*(8*10) = 70 + 24 = 94
    expect(row.score).toBe(94);
  });

  it('ranks a better-rated alfajor above an equally-matching worse one', async () => {
    wire({
      taste: taste({
        dulzor: 10,
        cantidadDDL: 0,
        calidadBano: 0,
        ratioTapaRelleno: 0,
        textura: 0,
      }),
      candidates: [
        candidate('low', {
          dulzor: 5,
          cantidadDDL: 0,
          calidadBano: 0,
          ratioTapaRelleno: 0,
          textura: 0,
          avgGeneral: 4,
        }),
        candidate('high', {
          dulzor: 5,
          cantidadDDL: 0,
          calidadBano: 0,
          ratioTapaRelleno: 0,
          textura: 0,
          avgGeneral: 9,
        }),
      ],
      found: [alfajor('low'), alfajor('high')],
    });
    const rows = await finder.execute('u1');
    expect(rows.map((r) => r.alfajor.id)).toEqual(['high', 'low']);
  });

  it('cold start: no fingerprint → ranks by quality with matchPct null', async () => {
    wire({
      taste: null,
      candidates: [
        candidate('mid', { avgGeneral: 7 }),
        candidate('top', { avgGeneral: 9 }),
      ],
      found: [alfajor('mid'), alfajor('top')],
    });
    const rows = await finder.execute('u1');
    expect(rows.map((r) => r.alfajor.id)).toEqual(['top', 'mid']);
    expect(rows.every((r) => r.matchPct === null)).toBe(true);
    // score = avgGeneral * 10
    expect(rows[0].score).toBe(90);
  });

  it('respects the requested limit', async () => {
    wire({
      taste: taste(),
      candidates: [candidate('a1'), candidate('a2'), candidate('a3')],
      found: [alfajor('a1'), alfajor('a2'), alfajor('a3')],
    });
    const rows = await finder.execute('u1', 2);
    expect(rows).toHaveLength(2);
  });

  it('hydrates alfajores with their marca relation', async () => {
    wire({ taste: taste(), candidates: [candidate('a1')] });
    await finder.execute('u1');
    expect(alfajores.find).toHaveBeenCalledWith(
      expect.objectContaining({ relations: ['marca'] }),
    );
  });

  it('skips a ranked candidate whose entity is no longer found', async () => {
    wire({ taste: taste(), candidates: [candidate('gone')], found: [] });
    const rows = await finder.execute('u1');
    expect(rows).toEqual([]);
  });

  it('returns fewer items than the limit when few candidates qualify', async () => {
    wire({
      taste: taste(),
      candidates: [candidate('a1'), candidate('a2')],
      found: [alfajor('a1'), alfajor('a2')],
    });
    const rows = await finder.execute('u1', 6);
    expect(rows).toHaveLength(2);
  });
});
