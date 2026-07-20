import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../../common/pipes/image-file.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginatedUserSearchDto } from './dto/user-search-result.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './domain/user.entity';
import { AvatarUpdater } from './services/avatar-updater';
import { UserSearcher } from './services/user-searcher';
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
    private readonly avatarUpdater: AvatarUpdater,
    private readonly searcher: UserSearcher,
  ) {}

  // Requiere auth (no opcional) porque el shape incluye isFollowing por resultado.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async search(
    @Query() dto: SearchUsersDto,
    @CurrentUser('id') viewerId: string,
  ): Promise<PaginatedUserSearchDto> {
    return this.searcher.execute(dto, viewerId);
  }

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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post('me/avatar')
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    return UserResponseDto.from(
      await this.avatarUpdater.execute(userId, file.buffer),
    );
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
