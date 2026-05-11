import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../domain/comment.entity';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentFinder } from './comment-finder';

@Injectable()
export class CommentUpdater {
  constructor(
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    private readonly finder: CommentFinder,
  ) {}

  async execute(id: string, dto: UpdateCommentDto, userId: string): Promise<Comment> {
    const comment = await this.finder.byId(id);
    if (comment.userId !== userId) {
      throw new ForbiddenException('only the author can edit this comment');
    }
    Object.assign(comment, dto);
    return this.comments.save(comment);
  }
}
