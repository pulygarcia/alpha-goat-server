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
      const qb = mockQb([a], [{ avgrating: '4.3333333333' }]);

      const result = await finder.byIdWithAverages('a1');

      expect(result).toEqual({ alfajor: a, avgRating: 4.33 });
      expect(qb.where).toHaveBeenCalledWith('a.id = :id', { id: 'a1' });
    });

    it('returns avgRating null when the alfajor has no reviews', async () => {
      const a = { id: 'a1' } as Alfajor;
      mockQb([a], [{ avgrating: null }]);

      const result = await finder.byIdWithAverages('a1');

      expect(result).toEqual({ alfajor: a, avgRating: null });
    });

    it('throws NotFoundException when missing', async () => {
      mockQb([], [{ avgrating: null }]);

      await expect(finder.byIdWithAverages('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
