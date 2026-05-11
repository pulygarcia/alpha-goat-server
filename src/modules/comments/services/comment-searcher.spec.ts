import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Review } from '../../reviews/domain/review.entity';
import { ReviewFinder } from '../../reviews/services/review-finder';
import { Comment } from '../domain/comment.entity';
import { CommentSearcher } from './comment-searcher';

describe('CommentSearcher', () => {
  let searcher: CommentSearcher;
  let repo: jest.Mocked<Repository<Comment>>;
  let reviewFinder: jest.Mocked<ReviewFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentSearcher,
        { provide: getRepositoryToken(Comment), useValue: { findAndCount: jest.fn() } },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();
    searcher = module.get(CommentSearcher);
    repo = module.get(getRepositoryToken(Comment));
    reviewFinder = module.get(ReviewFinder);
  });

  it('paginates comments scoped to the review', async () => {
    reviewFinder.byId.mockResolvedValue({ id: 'r1' } as Review);
    const items = [{ id: 'c1' } as Comment];
    repo.findAndCount.mockResolvedValue([items, 1]);

    const result = await searcher.execute('r1', { page: 2, limit: 10 });

    expect(reviewFinder.byId).toHaveBeenCalledWith('r1');
    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: { reviewId: 'r1' },
      order: { createdAt: 'ASC' },
      skip: 10,
      take: 10,
    });
    expect(result).toEqual({ items, total: 1, page: 2, limit: 10 });
  });
});
