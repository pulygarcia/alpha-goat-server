import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './domain/user.entity';
import { UserFinder } from './services/user-finder';
import { UserPasswordChanger } from './services/user-password-changer';
import { UserProfileAssembler } from './services/user-profile-assembler';
import { UserUpdater } from './services/user-updater';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly finder: UserFinder,
    private readonly updater: UserUpdater,
    private readonly passwordChanger: UserPasswordChanger,
    private readonly profiles: UserProfileAssembler,
  ) {}

  // Público con auth opcional: anónimo lo ve (isFollowing false, sin email);
  // autenticado obtiene isFollowing real y, en su propio perfil, el email.
  @Get('by-username/:username')
  @UseGuards(OptionalJwtAuthGuard)
  async profileByUsername(
    @Param('username') username: string,
    @CurrentUser() viewer?: User,
  ): Promise<ProfileResponseDto> {
    return this.profiles.byUsername(username, viewer?.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.finder.byId(id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.updater.execute(userId, dto));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.passwordChanger.execute(userId, dto);
  }
}
