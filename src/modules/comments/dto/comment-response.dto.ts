import { ApiProperty } from '@nestjs/swagger';
import { Comment } from '../domain/comment.entity';

class CommentAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
}

/** Datos calculados que no viven en la entidad (los aporta el searcher). */
export interface CommentResponseExtra {
  likesCount?: number;
  isLiked?: boolean;
}

export class CommentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() reviewId: string;
  @ApiProperty() userId: string;
  /** Autor anidado cuando la relación `user` está cargada; `null` si no se pidió. */
  @ApiProperty({ type: CommentAuthorDto, nullable: true })
  author: CommentAuthorDto | null;
  @ApiProperty() contenido: string;
  @ApiProperty() likesCount: number;
  /** Si el usuario actual ya likeó este comentario (false para anónimos / sin sesión). */
  @ApiProperty() isLiked: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(
    c: Comment,
    extra: CommentResponseExtra = {},
  ): CommentResponseDto {
    return {
      id: c.id,
      reviewId: c.reviewId,
      userId: c.userId,
      author: c.user
        ? {
            id: c.user.id,
            username: c.user.username,
            avatarUrl: c.user.avatarUrl,
          }
        : null,
      contenido: c.contenido,
      likesCount: extra.likesCount ?? 0,
      isLiked: extra.isLiked ?? false,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}

export class PaginatedCommentsDto {
  @ApiProperty({ type: [CommentResponseDto] }) items: CommentResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
