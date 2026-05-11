import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentLike } from '../domain/comment-like.entity';
import { CommentFinder } from './comment-finder';

@Injectable()
export class CommentLikeToggler {
  constructor(
    @InjectRepository(CommentLike)
    private readonly likes: Repository<CommentLike>,
    private readonly finder: CommentFinder,
  ) {}

  async like(commentId: string, userId: string): Promise<void> {
    await this.finder.byId(commentId);
    const exists = await this.likes.findOne({ where: { commentId, userId } });
    if (exists) return;
    await this.likes.save(this.likes.create({ commentId, userId }));
  }

  async unlike(commentId: string, userId: string): Promise<void> {
    await this.likes.delete({ commentId, userId });
  }
}
