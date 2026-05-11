import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Comment } from '../domain/comment.entity';
import { CommentFinder } from './comment-finder';

describe('CommentFinder', () => {
  let finder: CommentFinder;
  let repo: jest.Mocked<Repository<Comment>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentFinder,
        { provide: getRepositoryToken(Comment), useValue: { findOne: jest.fn() } },
      ],
    }).compile();
    finder = module.get(CommentFinder);
    repo = module.get(getRepositoryToken(Comment));
  });

  it('returns the comment when it exists', async () => {
    const c = { id: 'c1' } as Comment;
    repo.findOne.mockResolvedValue(c);
    await expect(finder.byId('c1')).resolves.toBe(c);
  });

  it('throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(finder.byId('c1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
