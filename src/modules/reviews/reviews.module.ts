import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlfajoresModule } from '../alfajores/alfajores.module';
import { AuthModule } from '../auth/auth.module';
import { ReviewLike } from './domain/review-like.entity';
import { Review } from './domain/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewCreator } from './services/review-creator';
import { ReviewFinder } from './services/review-finder';
import { ReviewLikeToggler } from './services/review-like-toggler';
import { ReviewRemover } from './services/review-remover';
import { ReviewSearcher } from './services/review-searcher';
import { ReviewUpdater } from './services/review-updater';

@Module({
  imports: [TypeOrmModule.forFeature([Review, ReviewLike]), AuthModule, AlfajoresModule],
  controllers: [ReviewsController],
  providers: [
    ReviewCreator,
    ReviewFinder,
    ReviewSearcher,
    ReviewUpdater,
    ReviewRemover,
    ReviewLikeToggler,
  ],
  exports: [ReviewFinder],
})
export class ReviewsModule {}
