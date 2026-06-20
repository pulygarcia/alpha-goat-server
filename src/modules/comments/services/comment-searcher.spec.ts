import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Review } from '../../reviews/domain/review.entity';
import { ReviewFinder } from '../../reviews/services/review-finder';
import { Comment } from '../domain/comment.entity';
import { CommentLikeToggler } from './comment-like-toggler';
import { CommentSearcher } from './comment-searcher';

describe('CommentSearcher', () => {
  let searcher: CommentSearcher;
  let repo: jest.Mocked<Repository<Comment>>;
  let reviewFinder: jest.Mocked<ReviewFinder>;
  let likes: jest.Mocked<CommentLikeToggler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentSearcher,
        {
          provide: getRepositoryToken(Comment),
          useValue: { findAndCount: jest.fn() },
        },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
        {
          provide: CommentLikeToggler,
          useValue: { countAmong: jest.fn(), likedAmong: jest.fn() },
        },
      ],
    }).compile();
    searcher = module.get(CommentSearcher);
    repo = module.get(getRepositoryToken(Comment));
    reviewFinder = module.get(ReviewFinder);
    likes = module.get(CommentLikeToggler);
  });

  it('paginates comments scoped to the review and hydrates likesCount', async () => {
    reviewFinder.byId.mockResolvedValue({ id: 'r1' } as Review);
    const items = [{ id: 'c1' } as Comment, { id: 'c2' } as Comment];
    repo.findAndCount.mockResolvedValue([items, 2]);
    likes.countAmong.mockResolvedValue(new Map([['c1', 3]]));

    const result = await searcher.execute('r1', { page: 2, limit: 10 });

    expect(reviewFinder.byId).toHaveBeenCalledWith('r1');
    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: { reviewId: 'r1' },
      relations: { user: true },
      order: { createdAt: 'ASC' },
      skip: 10,
      take: 10,
    });
    expect(likes.countAmong).toHaveBeenCalledWith(['c1', 'c2']);
    expect(result.total).toBe(2);
    expect(result.items).toEqual([
      { comment: items[0], likesCount: 3, isLiked: false },
      { comment: items[1], likesCount: 0, isLiked: false },
    ]);
  });

  it('does not resolve isLiked for anonymous users', async () => {
    reviewFinder.byId.mockResolvedValue({ id: 'r1' } as Review);
    repo.findAndCount.mockResolvedValue([[{ id: 'c1' } as Comment], 1]);
    likes.countAmong.mockResolvedValue(new Map());

    await searcher.execute('r1', { page: 1, limit: 10 });

    expect(likes.likedAmong).not.toHaveBeenCalled();
  });

  it('resolves isLiked for the current user', async () => {
    reviewFinder.byId.mockResolvedValue({ id: 'r1' } as Review);
    repo.findAndCount.mockResolvedValue([
      [{ id: 'c1' } as Comment, { id: 'c2' } as Comment],
      2,
    ]);
    likes.countAmong.mockResolvedValue(new Map());
    likes.likedAmong.mockResolvedValue(new Set(['c2']));

    const result = await searcher.execute('r1', { page: 1, limit: 10 }, 'u9');

    expect(likes.likedAmong).toHaveBeenCalledWith('u9', ['c1', 'c2']);
    expect(result.items[0].isLiked).toBe(false);
    expect(result.items[1].isLiked).toBe(true);
  });
});
