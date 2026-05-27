import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { UserFollow } from './domain/user-follow.entity';
import { FollowsController } from './follows.controller';
import { FollowToggler } from './services/follow-toggler';

@Module({
  imports: [TypeOrmModule.forFeature([UserFollow]), AuthModule, UsersModule],
  controllers: [FollowsController],
  providers: [FollowToggler],
  exports: [FollowToggler],
})
export class FollowsModule {}
