import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { AuthModule } from '../auth/auth.module';
import { FollowsModule } from '../follows/follows.module';
import { Review } from '../reviews/domain/review.entity';
import { FeedController } from './feed.controller';
import { FeedFinder } from './services/feed-finder';
import { FeedHeroFinder } from './services/feed-hero-finder';
import { FeedStatsFinder } from './services/feed-stats-finder';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Alfajor]),
    AuthModule,
    FollowsModule,
  ],
  controllers: [FeedController],
  providers: [FeedHeroFinder, FeedFinder, FeedStatsFinder],
})
export class FeedModule {}
