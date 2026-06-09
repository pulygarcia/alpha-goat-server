import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { AuthModule } from '../auth/auth.module';
import { Review } from '../reviews/domain/review.entity';
import { AdminMarcasController } from './admin-marcas.controller';
import { Marca } from './domain/marca.entity';
import { MarcasController } from './marcas.controller';
import { MarcaCreator } from './services/marca-creator';
import { MarcaFeaturedFinder } from './services/marca-featured-finder';
import { MarcaFinder } from './services/marca-finder';
import { MarcaSearcher } from './services/marca-searcher';
import { MarcaUpdater } from './services/marca-updater';

@Module({
  imports: [TypeOrmModule.forFeature([Marca, Alfajor, Review]), AuthModule],
  controllers: [MarcasController, AdminMarcasController],
  providers: [
    MarcaCreator,
    MarcaFinder,
    MarcaSearcher,
    MarcaUpdater,
    MarcaFeaturedFinder,
  ],
  exports: [MarcaFinder],
})
export class MarcasModule {}
