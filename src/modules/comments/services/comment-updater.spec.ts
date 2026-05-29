import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Comment } from '../domain/comment.entity';
import { CommentFinder } from './comment-finder';
import { CommentUpdater } from './comment-updater';

describe('CommentUpdater', () => {
  let updater: CommentUpdater;
  let repo: jest.Mocked<Repository<Comment>>;
  let finder: jest.Mocked<CommentFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentUpdater,
        { provide: getRepositoryToken(Comment), useValue: { save: jest.fn() } },
        { provide: CommentFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();
    updater = module.get(CommentUpdater);
    repo = module.get(getRepositoryToken(Comment));
    finder = module.get(CommentFinder);
  });

  it('updates the comment when the author requests it', async () => {
    const comment = { id: 'c1', userId: 'u1', contenido: 'old' } as Comment;
    finder.byId.mockResolvedValue(comment);
    repo.save.mockImplementation(async (c) => c as Comment);

    const result = await updater.execute('c1', { contenido: 'new' }, 'u1');

    expect(result.contenido).toBe('new');
  });

  it('throws ForbiddenException when caller is not the author', async () => {
    finder.byId.mockResolvedValue({ id: 'c1', userId: 'u1' } as Comment);
    await expect(
      updater.execute('c1', { contenido: 'x' }, 'u2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
