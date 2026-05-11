import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { CommentLike } from '../domain/comment-like.entity';
import { Comment } from '../domain/comment.entity';
import { CommentFinder } from './comment-finder';
import { CommentLikeToggler } from './comment-like-toggler';

describe('CommentLikeToggler', () => {
  let toggler: CommentLikeToggler;
  let repo: jest.Mocked<Repository<CommentLike>>;
  let finder: jest.Mocked<CommentFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentLikeToggler,
        {
          provide: getRepositoryToken(CommentLike),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: CommentFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();
    toggler = module.get(CommentLikeToggler);
    repo = module.get(getRepositoryToken(CommentLike));
    finder = module.get(CommentFinder);
  });

  it('creates a like when none exists', async () => {
    finder.byId.mockResolvedValue({ id: 'c1' } as Comment);
    repo.findOne.mockResolvedValue(null);
    const like = { commentId: 'c1', userId: 'u1' } as CommentLike;
    repo.create.mockReturnValue(like);

    await toggler.like('c1', 'u1');

    expect(repo.save).toHaveBeenCalledWith(like);
  });

  it('is idempotent when the like already exists', async () => {
    finder.byId.mockResolvedValue({ id: 'c1' } as Comment);
    repo.findOne.mockResolvedValue({ id: 'l1' } as CommentLike);

    await toggler.like('c1', 'u1');

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('deletes the like on unlike', async () => {
    await toggler.unlike('c1', 'u1');
    expect(repo.delete).toHaveBeenCalledWith({ commentId: 'c1', userId: 'u1' });
  });
});
