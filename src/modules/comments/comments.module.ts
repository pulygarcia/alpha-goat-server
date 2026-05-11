import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CommentsController } from './comments.controller';
import { CommentLike } from './domain/comment-like.entity';
import { Comment } from './domain/comment.entity';
import { CommentCreator } from './services/comment-creator';
import { CommentFinder } from './services/comment-finder';
import { CommentLikeToggler } from './services/comment-like-toggler';
import { CommentRemover } from './services/comment-remover';
import { CommentSearcher } from './services/comment-searcher';
import { CommentUpdater } from './services/comment-updater';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, CommentLike]), AuthModule, ReviewsModule],
  controllers: [CommentsController],
  providers: [
    CommentCreator,
    CommentFinder,
    CommentSearcher,
    CommentUpdater,
    CommentRemover,
    CommentLikeToggler,
  ],
})
export class CommentsModule {}
