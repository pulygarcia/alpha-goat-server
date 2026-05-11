import { ApiProperty } from '@nestjs/swagger';
import { Comment } from '../domain/comment.entity';

export class CommentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() reviewId: string;
  @ApiProperty() userId: string;
  @ApiProperty() contenido: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(c: Comment): CommentResponseDto {
    return {
      id: c.id,
      reviewId: c.reviewId,
      userId: c.userId,
      contenido: c.contenido,
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
