import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorFinder } from './alfajor-finder';

describe('AlfajorFinder', () => {
  let finder: AlfajorFinder;
  let repo: jest.Mocked<Repository<Alfajor>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorFinder,
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() },
        },
      ],
    }).compile();

    finder = module.get(AlfajorFinder);
    repo = module.get(getRepositoryToken(Alfajor));
  });

  describe('byId', () => {
    it('returns alfajor when found, loading the marca relation', async () => {
      const a = { id: 'a1' } as Alfajor;
      repo.findOne.mockResolvedValue(a);
      await expect(finder.byId('a1')).resolves.toBe(a);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'a1' },
        relations: { marca: true },
      });
    });

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(finder.byId('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('byIdWithAverages', () => {
    // AVG sobre numeric vuelve como string desde pg; el raw del mock imita eso.
    const rawWithReviews = {
      avgrating: '4.3333333333',
      avgdulzor: '7.6666666666',
      avgcantidadddl: '8.25',
      avgcalidadbano: '5.04',
      avgratiotaparelleno: '6.95',
      avgtextura: '9',
    };

    const rawWithoutReviews = {
      avgrating: null,
      avgdulzor: null,
      avgcantidadddl: null,
      avgcalidadbano: null,
      avgratiotaparelleno: null,
      avgtextura: null,
    };

    function mockQb(entities: Alfajor[], raw: unknown[]) {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawAndEntities: jest.fn().mockResolvedValue({ entities, raw }),
      } as unknown as SelectQueryBuilder<Alfajor>;
      repo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('returns the alfajor with avgRating rounded to 2 decimals', async () => {
      const a = { id: 'a1' } as Alfajor;
      const qb = mockQb([a], [rawWithReviews]);

      const result = await finder.byIdWithAverages('a1');

      expect(result.alfajor).toBe(a);
      expect(result.avgRating).toBe(4.33);
      expect(qb.where).toHaveBeenCalledWith('a.id = :id', { id: 'a1' });
    });

    it('returns the five ejes averages rounded to 1 decimal', async () => {
      const a = { id: 'a1' } as Alfajor;
      mockQb([a], [rawWithReviews]);

      const result = await finder.byIdWithAverages('a1');

      expect(result.avgEjes).toEqual({
        dulzor: 7.7,
        cantidadDDL: 8.3,
        calidadBano: 5,
        ratioTapaRelleno: 7,
        textura: 9,
      });
    });

    it('returns avgRating and avgEjes null when the alfajor has no reviews', async () => {
      const a = { id: 'a1' } as Alfajor;
      mockQb([a], [rawWithoutReviews]);

      const result = await finder.byIdWithAverages('a1');

      expect(result).toEqual({ alfajor: a, avgRating: null, avgEjes: null });
    });

    // Postgres foldea identificadores sin comillas a minúsculas: un alias
    // mixed-case rompe en runtime aunque el mock del qb no se entere.
    it('aliases every average in lowercase', async () => {
      const a = { id: 'a1' } as Alfajor;
      const qb = mockQb([a], [rawWithReviews]);

      await finder.byIdWithAverages('a1');

      const aliases = (qb.addSelect as jest.Mock).mock.calls.map(
        (call: [string, string]) => call[1],
      );
      expect(aliases).toEqual([
        'avgrating',
        'avgdulzor',
        'avgcantidadddl',
        'avgcalidadbano',
        'avgratiotaparelleno',
        'avgtextura',
      ]);
    });

    it('throws NotFoundException when missing', async () => {
      mockQb([], [rawWithoutReviews]);

      await expect(finder.byIdWithAverages('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
