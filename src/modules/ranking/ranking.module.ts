import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { Review } from '../reviews/domain/review.entity';
import { RankingController } from './ranking.controller';
import { WeeklyRankingFinder } from './services/weekly-ranking-finder';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Alfajor])],
  controllers: [RankingController],
  providers: [WeeklyRankingFinder],
})
export class RankingModule {}
