import { Test } from '@nestjs/testing';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { RankingController } from './ranking.controller';
import {
  GlobalRankingFinder,
  GlobalRankingRow,
} from './services/global-ranking-finder';
import { WeeklyRankingFinder } from './services/weekly-ranking-finder';

const row = (id: string, score: number): GlobalRankingRow => ({
  alfajor: {
    id,
    nombre: `Alfajor ${id}`,
    tipo: 'CLASICO',
    marcaId: `marca-${id}`,
    marca: { id: `marca-${id}`, nombre: `Marca ${id}`, logoUrl: null },
  } as unknown as Alfajor,
  score,
  reviewsCount: 10,
});

describe('RankingController (global)', () => {
  let controller: RankingController;
  let globalFinder: { execute: jest.Mock };

  beforeEach(async () => {
    globalFinder = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [RankingController],
      providers: [
        { provide: WeeklyRankingFinder, useValue: { execute: jest.fn() } },
        { provide: GlobalRankingFinder, useValue: globalFinder },
      ],
    }).compile();

    controller = module.get(RankingController);
  });

  it('passes page/limit through to the finder and maps rows to the paginated DTO', async () => {
    globalFinder.execute.mockResolvedValue({
      rows: [row('a1', 9.12), row('a2', 8.4)],
      total: 5,
      page: 2,
      limit: 10,
    });

    const res = await controller.global({ page: 2, limit: 10 });

    expect(globalFinder.execute).toHaveBeenCalledWith(2, 10);
    expect(res).toEqual({
      items: [
        {
          id: 'a1',
          nombre: 'Alfajor a1',
          tipo: 'CLASICO',
          score: 9.12,
          reviewsCount: 10,
          marca: { id: 'marca-a1', nombre: 'Marca a1', logoUrl: null },
        },
        {
          id: 'a2',
          nombre: 'Alfajor a2',
          tipo: 'CLASICO',
          score: 8.4,
          reviewsCount: 10,
          marca: { id: 'marca-a2', nombre: 'Marca a2', logoUrl: null },
        },
      ],
      total: 5,
      page: 2,
      limit: 10,
    });
  });

  it('returns an empty page when nothing qualifies', async () => {
    globalFinder.execute.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const res = await controller.global({ page: 1, limit: 20 });

    expect(res).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });
});
