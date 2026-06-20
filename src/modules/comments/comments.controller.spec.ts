import { Test } from '@nestjs/testing';
import { UserRole } from '../users/domain/user-role.enum';
import { User } from '../users/domain/user.entity';
import { CommentsController } from './comments.controller';
import { Comment } from './domain/comment.entity';
import { CommentCreator } from './services/comment-creator';
import { CommentFinder } from './services/comment-finder';
import { CommentLikeToggler } from './services/comment-like-toggler';
import { CommentRemover } from './services/comment-remover';
import { CommentSearcher } from './services/comment-searcher';
import { CommentUpdater } from './services/comment-updater';

describe('CommentsController', () => {
  let controller: CommentsController;
  let creator: jest.Mocked<CommentCreator>;
  let finder: jest.Mocked<CommentFinder>;
  let searcher: jest.Mocked<CommentSearcher>;
  let updater: jest.Mocked<CommentUpdater>;
  let remover: jest.Mocked<CommentRemover>;
  let likes: jest.Mocked<CommentLikeToggler>;

  const comment = {
    id: 'c1',
    reviewId: 'r1',
    userId: 'u1',
    contenido: 'hola',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Comment;

  const user = { id: 'u1', role: UserRole.USER } as User;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentCreator, useValue: { execute: jest.fn() } },
        { provide: CommentFinder, useValue: { byId: jest.fn() } },
        { provide: CommentSearcher, useValue: { execute: jest.fn() } },
        { provide: CommentUpdater, useValue: { execute: jest.fn() } },
        { provide: CommentRemover, useValue: { execute: jest.fn() } },
        {
          provide: CommentLikeToggler,
          useValue: { like: jest.fn(), unlike: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(CommentsController);
    creator = module.get(CommentCreator);
    finder = module.get(CommentFinder);
    searcher = module.get(CommentSearcher);
    updater = module.get(CommentUpdater);
    remover = module.get(CommentRemover);
    likes = module.get(CommentLikeToggler);
  });

  it('search returns paginated dtos with like data and forwards the current user', async () => {
    searcher.execute.mockResolvedValue({
      items: [{ comment, likesCount: 4, isLiked: true }],
      total: 1,
      page: 1,
      limit: 20,
    });
    const res = await controller.search('r1', { page: 1, limit: 20 }, user);
    expect(res.items[0].id).toBe('c1');
    expect(res.items[0].likesCount).toBe(4);
    expect(res.items[0].isLiked).toBe(true);
    expect(searcher.execute).toHaveBeenCalledWith(
      'r1',
      { page: 1, limit: 20 },
      'u1',
    );
  });

  it('search works for anonymous users (no current user)', async () => {
    searcher.execute.mockResolvedValue({
      items: [{ comment, likesCount: 0, isLiked: false }],
      total: 1,
      page: 1,
      limit: 20,
    });
    await controller.search('r1', { page: 1, limit: 20 }, undefined);
    expect(searcher.execute).toHaveBeenCalledWith(
      'r1',
      { page: 1, limit: 20 },
      undefined,
    );
  });

  it('findOne returns response dto', async () => {
    finder.byId.mockResolvedValue(comment);
    const res = await controller.findOne('c1');
    expect(res.id).toBe('c1');
  });

  it('create forwards reviewId, dto and userId', async () => {
    creator.execute.mockResolvedValue(comment);
    await controller.create('r1', { contenido: 'hola' }, user);
    expect(creator.execute).toHaveBeenCalledWith(
      'r1',
      { contenido: 'hola' },
      'u1',
    );
  });

  it('update forwards id, dto and userId', async () => {
    updater.execute.mockResolvedValue(comment);
    await controller.update('c1', { contenido: 'edit' }, user);
    expect(updater.execute).toHaveBeenCalledWith(
      'c1',
      { contenido: 'edit' },
      'u1',
    );
  });

  it('remove forwards actor context', async () => {
    remover.execute.mockResolvedValue();
    await controller.remove('c1', user);
    expect(remover.execute).toHaveBeenCalledWith('c1', {
      id: 'u1',
      role: UserRole.USER,
    });
  });

  it('like forwards id and userId', async () => {
    await controller.like('c1', user);
    expect(likes.like).toHaveBeenCalledWith('c1', 'u1');
  });

  it('unlike forwards id and userId', async () => {
    await controller.unlike('c1', user);
    expect(likes.unlike).toHaveBeenCalledWith('c1', 'u1');
  });
});
