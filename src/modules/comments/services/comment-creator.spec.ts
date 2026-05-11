import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Review } from '../../reviews/domain/review.entity';
import { ReviewFinder } from '../../reviews/services/review-finder';
import { Comment } from '../domain/comment.entity';
import { CommentCreator } from './comment-creator';

describe('CommentCreator', () => {
  let creator: CommentCreator;
  let repo: jest.Mocked<Repository<Comment>>;
  let reviewFinder: jest.Mocked<ReviewFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentCreator,
        {
          provide: getRepositoryToken(Comment),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    creator = module.get(CommentCreator);
    repo = module.get(getRepositoryToken(Comment));
    reviewFinder = module.get(ReviewFinder);
  });

  it('creates a comment after verifying the review exists', async () => {
    reviewFinder.byId.mockResolvedValue({ id: 'r1' } as Review);
    const entity = { id: 'c1', reviewId: 'r1', userId: 'u1', contenido: 'hola' } as Comment;
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);

    const result = await creator.execute('r1', { contenido: 'hola' }, 'u1');

    expect(reviewFinder.byId).toHaveBeenCalledWith('r1');
    expect(repo.create).toHaveBeenCalledWith({ reviewId: 'r1', userId: 'u1', contenido: 'hola' });
    expect(result).toBe(entity);
  });

  it('propagates NotFound when review does not exist', async () => {
    reviewFinder.byId.mockRejectedValue(new Error('not found'));
    await expect(creator.execute('r1', { contenido: 'x' }, 'u1')).rejects.toThrow('not found');
  });
});
