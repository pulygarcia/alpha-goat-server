import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { Marca } from '../marcas/domain/marca.entity';
import { Review } from '../reviews/domain/review.entity';
import { UsersModule } from '../users/users.module';
import { AlbumController } from './album.controller';
import { AlbumFinder } from './services/album-finder';

@Module({
  imports: [TypeOrmModule.forFeature([Alfajor, Review, Marca]), UsersModule],
  controllers: [AlbumController],
  providers: [AlbumFinder],
})
export class AlbumModule {}
