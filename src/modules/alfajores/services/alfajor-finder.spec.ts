import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    finder = module.get(AlfajorFinder);
    repo = module.get(getRepositoryToken(Alfajor));
  });

  it('returns alfajor when found', async () => {
    const a = { id: 'a1' } as Alfajor;
    repo.findOne.mockResolvedValue(a);
    await expect(finder.byId('a1')).resolves.toBe(a);
  });

  it('throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(finder.byId('missing')).rejects.toThrow(NotFoundException);
  });
});
