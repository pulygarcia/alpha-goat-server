import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlfajoresModule } from '../alfajores/alfajores.module';
import { AuthModule } from '../auth/auth.module';
import { FollowsModule } from '../follows/follows.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ReviewLike } from './domain/review-like.entity';
import { Review } from './domain/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewCreator } from './services/review-creator';
import { ReviewFinder } from './services/review-finder';
import { ReviewImageUpdater } from './services/review-image-updater';
import { ReviewLikeToggler } from './services/review-like-toggler';
import { ReviewRemover } from './services/review-remover';
import { ReviewSearcher } from './services/review-searcher';
import { ReviewUpdater } from './services/review-updater';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ReviewLike]),
    AuthModule,
    AlfajoresModule,
    FollowsModule,
    UploadsModule,
  ],
  controllers: [ReviewsController],
  providers: [
    ReviewCreator,
    ReviewFinder,
    ReviewSearcher,
    ReviewUpdater,
    ReviewRemover,
    ReviewLikeToggler,
    ReviewImageUpdater,
  ],
  exports: [ReviewFinder, ReviewLikeToggler],
})
export class ReviewsModule {}
