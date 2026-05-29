import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/domain/user.entity';
import { ACCESS_TOKEN_COOKIE, accessTokenCookieOptions } from './auth.cookie';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtTokenSigner } from './services/jwt-token-signer';
import { UserAuthenticator } from './services/user-authenticator';
import { UserRegistrar } from './services/user-registrar';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registrar: UserRegistrar,
    private readonly authenticator: UserAuthenticator,
    private readonly signer: JwtTokenSigner,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const user = await this.registrar.execute(dto);
    return this.buildResponse(user, res);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const user = await this.authenticator.execute(dto);
    return this.buildResponse(user, res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, {
      ...accessTokenCookieOptions(),
      maxAge: undefined,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.from(user);
  }

  private async buildResponse(
    user: User,
    res: Response,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.signer.sign(user);
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions());
    return { user: UserResponseDto.from(user) };
  }
}
