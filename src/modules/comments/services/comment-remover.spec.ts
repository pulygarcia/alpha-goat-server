import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { Comment } from '../domain/comment.entity';
import { CommentFinder } from './comment-finder';
import { CommentRemover } from './comment-remover';

describe('CommentRemover', () => {
  let remover: CommentRemover;
  let repo: jest.Mocked<Repository<Comment>>;
  let finder: jest.Mocked<CommentFinder>;

  const comment = { id: 'c1', userId: 'u1' } as Comment;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentRemover,
        {
          provide: getRepositoryToken(Comment),
          useValue: { remove: jest.fn() },
        },
        {
          provide: CommentFinder,
          useValue: { byId: jest.fn().mockResolvedValue(comment) },
        },
      ],
    }).compile();
    remover = module.get(CommentRemover);
    repo = module.get(getRepositoryToken(Comment));
    finder = module.get(CommentFinder);
  });

  it('removes when caller is the author', async () => {
    await remover.execute('c1', { id: 'u1', role: UserRole.USER });
    expect(repo.remove).toHaveBeenCalledWith(comment);
  });

  it('removes when caller is admin', async () => {
    await remover.execute('c1', { id: 'u9', role: UserRole.ADMIN });
    expect(repo.remove).toHaveBeenCalledWith(comment);
  });

  it('throws ForbiddenException when caller is neither author nor admin', async () => {
    await expect(
      remover.execute('c1', { id: 'u2', role: UserRole.USER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.remove).not.toHaveBeenCalled();
    expect(finder.byId).toHaveBeenCalled();
  });
});
