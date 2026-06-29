import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MarcasModule } from '../marcas/marcas.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AlfajoresController } from './alfajores.controller';
import { Alfajor } from './domain/alfajor.entity';
import { AlfajorCreator } from './services/alfajor-creator';
import { AlfajorFinder } from './services/alfajor-finder';
import { AlfajorImageUpdater } from './services/alfajor-image-updater';
import { AlfajorSearcher } from './services/alfajor-searcher';
import { AlfajorUpdater } from './services/alfajor-updater';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alfajor]),
    AuthModule,
    MarcasModule,
    UploadsModule,
  ],
  controllers: [AlfajoresController],
  providers: [
    AlfajorCreator,
    AlfajorFinder,
    AlfajorSearcher,
    AlfajorUpdater,
    AlfajorImageUpdater,
  ],
  exports: [AlfajorFinder, AlfajorSearcher],
})
export class AlfajoresModule {}
