import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { Comment } from '../domain/comment.entity';
import { CommentFinder } from './comment-finder';

export interface ActorContext {
  id: string;
  role: UserRole;
}

@Injectable()
export class CommentRemover {
  constructor(
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    private readonly finder: CommentFinder,
  ) {}

  async execute(id: string, actor: ActorContext): Promise<void> {
    const comment = await this.finder.byId(id);
    if (actor.role !== UserRole.ADMIN && comment.userId !== actor.id) {
      throw new ForbiddenException(
        'only the author or an admin can delete this comment',
      );
    }
    await this.comments.remove(comment);
  }
}
