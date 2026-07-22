import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { Review } from '../reviews/domain/review.entity';
import { User } from '../users/domain/user.entity';
import { GlobalStatsFinder } from './services/global-stats-finder';
import { StatsController } from './stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Alfajor, User])],
  controllers: [StatsController],
  providers: [GlobalStatsFinder],
})
export class StatsModule {}
