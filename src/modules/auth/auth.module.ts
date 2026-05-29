import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/domain/user.entity';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtTokenSigner } from './services/jwt-token-signer';
import { PasswordHasher } from './services/password-hasher';
import { UserAuthenticator } from './services/user-authenticator';
import { UserRegistrar } from './services/user-registrar';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>(
            'JWT_EXPIRES_IN',
          ) as unknown as number,
        },
      }),
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [
    PasswordHasher,
    JwtTokenSigner,
    UserRegistrar,
    UserAuthenticator,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [PasswordHasher, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
