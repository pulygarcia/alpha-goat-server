import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  // Subconjunto de `commentIds` que `userId` likeó. Acotado a la página (mismo
  // enfoque que ReviewLikeToggler.likedAmong). Set vacío sin query sin candidatos.
  async likedAmong(userId: string, commentIds: string[]): Promise<Set<string>> {
    if (commentIds.length === 0) return new Set();
    const rows = await this.likes.find({
      where: { userId, commentId: In(commentIds) },
      select: { commentId: true },
    });
    return new Set(rows.map((r) => r.commentId));
  }

  // Cantidad de likes por comentario, acotada a la página. Map vacío sin query
  // si no hay candidatos.
  async countAmong(commentIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (commentIds.length === 0) return counts;
    const rows = await this.likes.find({
      where: { commentId: In(commentIds) },
      select: { commentId: true },
    });
    for (const r of rows) {
      counts.set(r.commentId, (counts.get(r.commentId) ?? 0) + 1);
    }
    return counts;
  }
}
