import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/domain/user.entity';
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
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.registrar.execute(dto);
    return this.buildResponse(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authenticator.execute(dto);
    return this.buildResponse(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.from(user);
  }

  private async buildResponse(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.signer.sign(user);
    return { accessToken, user: UserResponseDto.from(user) };
  }
}
