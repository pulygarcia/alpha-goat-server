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
            find: jest.fn(),
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

  describe('likedAmong', () => {
    it('returns the subset of comment ids the user liked', async () => {
      repo.find.mockResolvedValue([
        { commentId: 'c1' } as CommentLike,
        { commentId: 'c3' } as CommentLike,
      ]);

      const liked = await toggler.likedAmong('u1', ['c1', 'c2', 'c3']);

      expect(liked).toEqual(new Set(['c1', 'c3']));
    });

    it('returns an empty set without querying when there are no candidates', async () => {
      const liked = await toggler.likedAmong('u1', []);
      expect(liked).toEqual(new Set());
      expect(repo.find).not.toHaveBeenCalled();
    });
  });

  describe('countAmong', () => {
    it('tallies likes per comment id', async () => {
      repo.find.mockResolvedValue([
        { commentId: 'c1' } as CommentLike,
        { commentId: 'c1' } as CommentLike,
        { commentId: 'c2' } as CommentLike,
      ]);

      const counts = await toggler.countAmong(['c1', 'c2']);

      expect(counts.get('c1')).toBe(2);
      expect(counts.get('c2')).toBe(1);
    });

    it('returns an empty map without querying when there are no candidates', async () => {
      const counts = await toggler.countAmong([]);
      expect(counts.size).toBe(0);
      expect(repo.find).not.toHaveBeenCalled();
    });
  });
});
