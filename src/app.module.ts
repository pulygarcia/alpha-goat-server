import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env.validation';
import { typeOrmConfig } from './config/typeorm.config';
import { AlbumModule } from './modules/album/album.module';
import { AlfajoresModule } from './modules/alfajores/alfajores.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FeedModule } from './modules/feed/feed.module';
import { FollowsModule } from './modules/follows/follows.module';
import { MarcasModule } from './modules/marcas/marcas.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { StatsModule } from './modules/stats/stats.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    AuthModule,
    UsersModule,
    MarcasModule,
    AlfajoresModule,
    ReviewsModule,
    CommentsModule,
    ModerationModule,
    FollowsModule,
    FeedModule,
    RankingModule,
    RecommendationsModule,
    AlbumModule,
    StatsModule,
  ],
})
export class AppModule {}
