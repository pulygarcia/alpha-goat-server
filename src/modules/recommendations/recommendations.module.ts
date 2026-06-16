import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { Review } from '../reviews/domain/review.entity';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationFinder } from './services/recommendation-finder';
import { UserTasteFingerprint } from './services/user-taste-fingerprint';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Alfajor])],
  controllers: [RecommendationsController],
  providers: [UserTasteFingerprint, RecommendationFinder],
})
export class RecommendationsModule {}
