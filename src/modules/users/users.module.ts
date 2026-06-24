import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { FollowsModule } from '../follows/follows.module';
import { Review } from '../reviews/domain/review.entity';
import { User } from './domain/user.entity';
import { UserFinder } from './services/user-finder';
import { UserPasswordChanger } from './services/user-password-changer';
import { UserProfileAssembler } from './services/user-profile-assembler';
import { UserUpdater } from './services/user-updater';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Review]),
    forwardRef(() => AuthModule),
    forwardRef(() => FollowsModule),
  ],
  controllers: [UsersController],
  providers: [
    UserFinder,
    UserUpdater,
    UserPasswordChanger,
    UserProfileAssembler,
  ],
  exports: [UserFinder, UserUpdater, TypeOrmModule],
})
export class UsersModule {}
