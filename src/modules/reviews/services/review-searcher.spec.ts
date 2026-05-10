import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../domain/review.entity';
import { ReviewSearcher } from './review-searcher';

describe('ReviewSearcher', () => {
  let searcher: ReviewSearcher;
  let repo: jest.Mocked<Repository<Review>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewSearcher,
        { provide: getRepositoryToken(Review), useValue: { findAndCount: jest.fn() } },
      ],
    }).compile();

    searcher = module.get(ReviewSearcher);
    repo = module.get(getRepositoryToken(Review));
  });

  it('filters by alfajorId and userId with pagination', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    await searcher.execute({ alfajorId: 'a1', userId: 'u1', page: 2, limit: 5 });

    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: { alfajorId: 'a1', userId: 'u1' },
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
  });

  it('returns paginated result without filters', async () => {
    const items = [{ id: 'r1' } as Review];
    repo.findAndCount.mockResolvedValue([items, 1]);

    const res = await searcher.execute({ page: 1, limit: 20 });

    expect(res).toEqual({ items, total: 1, page: 1, limit: 20 });
  });
});
