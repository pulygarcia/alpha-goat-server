import { Test } from '@nestjs/testing';
import { Review } from '../reviews/domain/review.entity';
import { User } from '../users/domain/user.entity';
import { FeedQueryDto, FeedSort } from './dto/feed-query.dto';
import { FeedController } from './feed.controller';
import { FeedFinder } from './services/feed-finder';
import { FeedHeroFinder } from './services/feed-hero-finder';
import { FeedStatsFinder } from './services/feed-stats-finder';

describe('FeedController', () => {
  let controller: FeedController;
  let finder: jest.Mocked<Pick<FeedFinder, 'execute'>>;
  let statsFinder: jest.Mocked<Pick<FeedStatsFinder, 'execute'>>;

  beforeEach(async () => {
    finder = { execute: jest.fn() };
    statsFinder = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        { provide: FeedHeroFinder, useValue: { execute: jest.fn() } },
        { provide: FeedFinder, useValue: finder },
        { provide: FeedStatsFinder, useValue: statsFinder },
      ],
    }).compile();

    controller = module.get(FeedController);
  });

  it('maps a feed row into the nested item dto', async () => {
    const review = {
      id: 'r1',
      comentario: 'muy rico',
      fotoUrl: 'http://img/r1.jpg',
      ratingGeneral: 8.5,
      dulzor: 7,
      cantidadDDL: 9,
      calidadBano: 8,
      ratioTapaRelleno: 7.5,
      textura: 8,
      createdAt: new Date('2026-05-26T10:00:00Z'),
      user: { id: 'u1', username: 'puly', avatarUrl: null },
      alfajor: {
        id: 'a1',
        nombre: 'Havannet',
        tipo: 'CHOCOLATE',
        imagenUrl: null,
        marca: { id: 'm1', nombre: 'Havanna', provincia: 'BA' },
      },
    } as unknown as Review;

    finder.execute.mockResolvedValue({
      rows: [
        {
          review,
          likes: 12,
          commentsCount: 3,
          isFollowing: true,
          isLiked: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const dto: FeedQueryDto = { sort: FeedSort.RECENT, page: 1, limit: 20 };
    const res = await controller.list(dto, { id: 'u1' } as User);

    expect(res.total).toBe(1);
    expect(res.items[0]).toEqual({
      id: 'r1',
      author: {
        id: 'u1',
        username: 'puly',
        avatarUrl: null,
        isFollowing: true,
      },
      alfajor: {
        id: 'a1',
        nombre: 'Havannet',
        tipo: 'CHOCOLATE',
        imagenUrl: null,
      },
      marca: { id: 'm1', nombre: 'Havanna', provincia: 'BA' },
      quote: 'muy rico',
      photoUrl: 'http://img/r1.jpg',
      overall: 8.5,
      axes: {
        dulzor: 7,
        cantidadDDL: 9,
        calidadBano: 8,
        ratioTapaRelleno: 7.5,
        textura: 8,
      },
      likes: 12,
      commentsCount: 3,
      isLiked: true,
      createdAt: review.createdAt,
    });
  });

  it('forwards the query dto and current user id to the finder', async () => {
    finder.execute.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    const dto: FeedQueryDto = { sort: FeedSort.RECENT, page: 2, limit: 10 };

    await controller.list(dto, { id: 'u9' } as User);

    expect(finder.execute).toHaveBeenCalledWith(dto, 'u9');
  });

  it('forwards undefined to the finder for anonymous requests', async () => {
    finder.execute.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    const dto: FeedQueryDto = { sort: FeedSort.RECENT, page: 1, limit: 20 };

    await controller.list(dto, undefined);

    expect(finder.execute).toHaveBeenCalledWith(dto, undefined);
  });

  it('returns the subnav stats from the finder', async () => {
    statsFinder.execute.mockResolvedValue({ todayCount: 4, weekCount: 21 });

    const res = await controller.stats();

    expect(res).toEqual({ todayCount: 4, weekCount: 21 });
  });
});
