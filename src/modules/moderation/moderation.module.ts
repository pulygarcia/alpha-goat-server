import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlfajoresModule } from '../alfajores/alfajores.module';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { AuthModule } from '../auth/auth.module';
import { MarcasModule } from '../marcas/marcas.module';
import { ModerationController } from './moderation.controller';
import { AlfajorApprover } from './services/alfajor-approver';
import { AlfajorRejecter } from './services/alfajor-rejecter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alfajor]),
    AuthModule,
    AlfajoresModule,
    MarcasModule,
  ],
  controllers: [ModerationController],
  providers: [AlfajorApprover, AlfajorRejecter],
})
export class ModerationModule {}
