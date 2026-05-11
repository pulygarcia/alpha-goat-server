import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../domain/comment.entity';

@Injectable()
export class CommentFinder {
  constructor(
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
  ) {}

  async byId(id: string): Promise<Comment> {
    const c = await this.comments.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`comment ${id} not found`);
    return c;
  }
}
