import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewFinder } from '../../reviews/services/review-finder';
import { Comment } from '../domain/comment.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { CommentFinder } from './comment-finder';

@Injectable()
export class CommentCreator {
  constructor(
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    private readonly reviewFinder: ReviewFinder,
    private readonly finder: CommentFinder,
  ) {}

  async execute(
    reviewId: string,
    dto: CreateCommentDto,
    userId: string,
  ): Promise<Comment> {
    await this.reviewFinder.byId(reviewId);
    const comment = this.comments.create({
      reviewId,
      userId,
      contenido: dto.contenido,
    });
    const saved = await this.comments.save(comment);
    // Rehidratamos con el autor para que el POST devuelva el mismo shape que el listado.
    return this.finder.byId(saved.id);
  }
}
