import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { Review } from '../../reviews/domain/review.entity';
import { FeedHeroFinder } from './feed-hero-finder';

describe('FeedHeroFinder', () => {
  let finder: FeedHeroFinder;
  let reviews: { createQueryBuilder: jest.Mock; count: jest.Mock };
  let alfajores: jest.Mocked<Pick<Repository<Alfajor>, 'findOne'>>;

  const makeQb = (raw: unknown, count = 0) => {
    const qb: any = {};
    const chain = ['innerJoin', 'select', 'addSelect', 'where', 'andWhere', 'groupBy',
      'orderBy', 'addOrderBy', 'limit'];
    for (const m of chain) qb[m] = jest.fn().mockReturnValue(qb);
    qb.getRawOne = jest.fn().mockResolvedValue(raw);
    qb.getCount = jest.fn().mockResolvedValue(count);
    return qb;
  };

  beforeEach(async () => {
    reviews = { createQueryBuilder: jest.fn(), count: jest.fn() };
    alfajores = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        FeedHeroFinder,
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: getRepositoryToken(Alfajor), useValue: alfajores },
      ],
    }).compile();

    finder = module.get(FeedHeroFinder);
  });

  it('returns null when no reviews exist in any window', async () => {
    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(undefined)) // pickByTimeWindow
      .mockReturnValueOnce(makeQb(undefined)); // pickAllTime

    const result = await finder.execute(new Date('2026-05-25T12:00:00Z'));

    expect(result).toBeNull();
    expect(alfajores.findOne).not.toHaveBeenCalled();
  });

  it('falls back to all-time pick when window is empty', async () => {
    const winner = {
      id: 'a1',
      nombre: 'Havannet',
      tipo: 'CHOCOLATE',
      imagenUrl: null,
      marca: { id: 'm1', nombre: 'Havanna', provincia: 'BA' },
    } as unknown as Alfajor;

    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb(undefined)) // pickByTimeWindow empty
      .mockReturnValueOnce(makeQb({ alfajorId: 'a1' })) // pickAllTime
      .mockReturnValueOnce(
        makeQb({
          general: '8.5', dulzor: '7', cantidadDDL: '9',
          calidadBano: '8', ratioTapaRelleno: '7.5', textura: '8.2',
        }),
      ) // averages
      .mockReturnValueOnce(makeQb(undefined, 0)) // countInTimeWindow thisWeek
      .mockReturnValueOnce(makeQb(undefined, 0)); // countInTimeWindow lastWeek

    alfajores.findOne.mockResolvedValue(winner);
    reviews.count.mockResolvedValue(42);

    const result = await finder.execute(new Date('2026-05-25T12:00:00Z'));

    expect(result).not.toBeNull();
    expect(result!.alfajor).toBe(winner);
    expect(result!.ratings.general).toBe(8.5);
    expect(result!.stats).toEqual({
      reviewsThisWeek: 0,
      reviewsLastWeek: 0,
      deltaPct: null,
      totalReviews: 42,
    });
  });

  it('computes deltaPct as percentage change vs last week', async () => {
    const winner = { id: 'a1', marca: { id: 'm1' } } as unknown as Alfajor;

    reviews.createQueryBuilder
      .mockReturnValueOnce(makeQb({ alfajorId: 'a1' })) // pickByTimeWindow
      .mockReturnValueOnce(
        makeQb({
          general: '9', dulzor: '9', cantidadDDL: '9',
          calidadBano: '9', ratioTapaRelleno: '9', textura: '9',
        }),
      )
      .mockReturnValueOnce(makeQb(undefined, 8)) // thisWeek
      .mockReturnValueOnce(makeQb(undefined, 4)); // lastWeek

    alfajores.findOne.mockResolvedValue(winner);
    reviews.count.mockResolvedValue(20);

    const result = await finder.execute(new Date('2026-05-25T12:00:00Z'));

    expect(result!.stats.deltaPct).toBe(100); // (8-4)/4 * 100
    expect(result!.stats.reviewsThisWeek).toBe(8);
    expect(result!.stats.reviewsLastWeek).toBe(4);
  });

  it('returns null when winner id resolves to a missing alfajor', async () => {
    reviews.createQueryBuilder.mockReturnValueOnce(makeQb({ alfajorId: 'a1' }));
    alfajores.findOne.mockResolvedValue(null);

    const result = await finder.execute(new Date('2026-05-25T12:00:00Z'));

    expect(result).toBeNull();
  });

  it('uses a 7-day window ending at the given `now`', async () => {
    const now = new Date('2026-05-25T12:00:00Z');
    const qb = makeQb({ alfajorId: 'a1' });
    reviews.createQueryBuilder
      .mockReturnValueOnce(qb)
      .mockReturnValueOnce(
        makeQb({
          general: '5', dulzor: '5', cantidadDDL: '5',
          calidadBano: '5', ratioTapaRelleno: '5', textura: '5',
        }),
      )
      .mockReturnValueOnce(makeQb(undefined, 1))
      .mockReturnValueOnce(makeQb(undefined, 1));

    alfajores.findOne.mockResolvedValue({ id: 'a1', marca: {} } as unknown as Alfajor);
    reviews.count.mockResolvedValue(1);

    await finder.execute(now);

    const windowCall = qb.andWhere.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('createdAt'),
    );
    expect(windowCall).toBeDefined();
    const { from, to } = windowCall![1];
    expect(to).toEqual(now);
    expect(to.getTime() - from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
