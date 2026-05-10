import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../domain/review.entity';
import { ReviewFinder } from './review-finder';
import { ReviewUpdater } from './review-updater';

describe('ReviewUpdater', () => {
  let updater: ReviewUpdater;
  let repo: jest.Mocked<Repository<Review>>;
  let finder: jest.Mocked<ReviewFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewUpdater,
        { provide: getRepositoryToken(Review), useValue: { save: jest.fn() } },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    updater = module.get(ReviewUpdater);
    repo = module.get(getRepositoryToken(Review));
    finder = module.get(ReviewFinder);
  });

  it('updates fields when actor is the author', async () => {
    const review = { id: 'r1', userId: 'u1', dulzor: 5 } as Review;
    finder.byId.mockResolvedValue(review);
    repo.save.mockImplementation(async (r) => r as Review);

    const result = await updater.execute('r1', { dulzor: 9 }, 'u1');

    expect(result.dulzor).toBe(9);
  });

  it('throws ForbiddenException when actor is not the author', async () => {
    finder.byId.mockResolvedValue({ userId: 'other' } as Review);

    await expect(updater.execute('r1', { dulzor: 9 }, 'u1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});
