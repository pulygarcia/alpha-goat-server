import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { Review } from '../reviews/domain/review.entity';
import { RankingController } from './ranking.controller';
import { GlobalRankingFinder } from './services/global-ranking-finder';
import { WeeklyRankingFinder } from './services/weekly-ranking-finder';
import { WorstRankedFinder } from './services/worst-ranked-finder';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Alfajor])],
  controllers: [RankingController],
  providers: [WeeklyRankingFinder, GlobalRankingFinder, WorstRankedFinder],
})
export class RankingModule {}
