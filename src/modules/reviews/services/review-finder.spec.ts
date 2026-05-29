import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../domain/review.entity';
import { ReviewFinder } from './review-finder';

describe('ReviewFinder', () => {
  let finder: ReviewFinder;
  let repo: jest.Mocked<Repository<Review>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewFinder,
        {
          provide: getRepositoryToken(Review),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    finder = module.get(ReviewFinder);
    repo = module.get(getRepositoryToken(Review));
  });

  it('returns review when found', async () => {
    const r = { id: 'r1' } as Review;
    repo.findOne.mockResolvedValue(r);
    await expect(finder.byId('r1')).resolves.toBe(r);
  });

  it('throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(finder.byId('missing')).rejects.toThrow(NotFoundException);
  });
});
