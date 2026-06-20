import { Comment } from '../domain/comment.entity';
import { User } from '../../users/domain/user.entity';
import { CommentResponseDto } from './comment-response.dto';

describe('CommentResponseDto', () => {
  const base = {
    id: 'c1',
    reviewId: 'r1',
    userId: 'u1',
    contenido: 'hola',
    createdAt: new Date('2026-06-18T00:00:00.000Z'),
    updatedAt: new Date('2026-06-18T00:00:00.000Z'),
  } as Comment;

  it('nests the author when the user relation is loaded', () => {
    const c = {
      ...base,
      user: { id: 'u1', username: 'pepe', avatarUrl: null } as User,
    } as Comment;

    const dto = CommentResponseDto.from(c);

    expect(dto.author).toEqual({ id: 'u1', username: 'pepe', avatarUrl: null });
  });

  it('leaves author null when the user relation is not loaded', () => {
    const dto = CommentResponseDto.from(base);
    expect(dto.author).toBeNull();
  });

  it('maps the scalar fields', () => {
    const dto = CommentResponseDto.from(base);
    expect(dto).toMatchObject({
      id: 'c1',
      reviewId: 'r1',
      userId: 'u1',
      contenido: 'hola',
    });
  });

  it('carries likesCount and isLiked from the extra data', () => {
    const dto = CommentResponseDto.from(base, { likesCount: 4, isLiked: true });
    expect(dto.likesCount).toBe(4);
    expect(dto.isLiked).toBe(true);
  });

  it('defaults likesCount to 0 and isLiked to false', () => {
    const dto = CommentResponseDto.from(base);
    expect(dto.likesCount).toBe(0);
    expect(dto.isLiked).toBe(false);
  });
});
