import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { Review } from '../domain/review.entity';
import { ReviewFinder } from './review-finder';
import { ReviewRemover } from './review-remover';

describe('ReviewRemover', () => {
  let remover: ReviewRemover;
  let repo: jest.Mocked<Repository<Review>>;
  let finder: jest.Mocked<ReviewFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewRemover,
        { provide: getRepositoryToken(Review), useValue: { remove: jest.fn() } },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    remover = module.get(ReviewRemover);
    repo = module.get(getRepositoryToken(Review));
    finder = module.get(ReviewFinder);
  });

  it('author can delete own review', async () => {
    const review = { id: 'r1', userId: 'u1' } as Review;
    finder.byId.mockResolvedValue(review);

    await remover.execute('r1', { id: 'u1', role: UserRole.USER });

    expect(repo.remove).toHaveBeenCalledWith(review);
  });

  it('admin can delete any review', async () => {
    const review = { id: 'r1', userId: 'someone' } as Review;
    finder.byId.mockResolvedValue(review);

    await remover.execute('r1', { id: 'admin', role: UserRole.ADMIN });

    expect(repo.remove).toHaveBeenCalledWith(review);
  });

  it('non-author non-admin cannot delete', async () => {
    finder.byId.mockResolvedValue({ id: 'r1', userId: 'someone' } as Review);

    await expect(
      remover.execute('r1', { id: 'other', role: UserRole.USER }),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
