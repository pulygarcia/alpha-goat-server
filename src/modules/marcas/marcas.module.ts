import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminMarcasController } from './admin-marcas.controller';
import { Marca } from './domain/marca.entity';
import { MarcasController } from './marcas.controller';
import { MarcaCreator } from './services/marca-creator';
import { MarcaFinder } from './services/marca-finder';
import { MarcaSearcher } from './services/marca-searcher';
import { MarcaUpdater } from './services/marca-updater';

@Module({
  imports: [TypeOrmModule.forFeature([Marca]), AuthModule],
  controllers: [MarcasController, AdminMarcasController],
  providers: [MarcaCreator, MarcaFinder, MarcaSearcher, MarcaUpdater],
  exports: [MarcaFinder],
})
export class MarcasModule {}
