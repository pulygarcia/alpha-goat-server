import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { Review } from '../reviews/domain/review.entity';
import { FeedController } from './feed.controller';
import { FeedHeroFinder } from './services/feed-hero-finder';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Alfajor])],
  controllers: [FeedController],
  providers: [FeedHeroFinder],
})
export class FeedModule {}
