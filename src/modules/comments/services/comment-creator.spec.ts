import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Review } from '../../reviews/domain/review.entity';
import { ReviewFinder } from '../../reviews/services/review-finder';
import { Comment } from '../domain/comment.entity';
import { CommentCreator } from './comment-creator';
import { CommentFinder } from './comment-finder';

describe('CommentCreator', () => {
  let creator: CommentCreator;
  let repo: jest.Mocked<Repository<Comment>>;
  let reviewFinder: jest.Mocked<ReviewFinder>;
  let finder: jest.Mocked<CommentFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentCreator,
        {
          provide: getRepositoryToken(Comment),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
        { provide: CommentFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    creator = module.get(CommentCreator);
    repo = module.get(getRepositoryToken(Comment));
    reviewFinder = module.get(ReviewFinder);
    finder = module.get(CommentFinder);
  });

  it('creates a comment then returns it rehydrated with its author', async () => {
    reviewFinder.byId.mockResolvedValue({ id: 'r1' } as Review);
    const entity = {
      id: 'c1',
      reviewId: 'r1',
      userId: 'u1',
      contenido: 'hola',
    } as Comment;
    const hydrated = { ...entity, user: { id: 'u1' } } as Comment;
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);
    finder.byId.mockResolvedValue(hydrated);

    const result = await creator.execute('r1', { contenido: 'hola' }, 'u1');

    expect(reviewFinder.byId).toHaveBeenCalledWith('r1');
    expect(repo.create).toHaveBeenCalledWith({
      reviewId: 'r1',
      userId: 'u1',
      contenido: 'hola',
    });
    expect(finder.byId).toHaveBeenCalledWith('c1');
    expect(result).toBe(hydrated);
  });

  it('propagates NotFound when review does not exist', async () => {
    reviewFinder.byId.mockRejectedValue(new Error('not found'));
    await expect(
      creator.execute('r1', { contenido: 'x' }, 'u1'),
    ).rejects.toThrow('not found');
  });
});
