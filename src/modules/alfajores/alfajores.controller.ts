import {
  Body,
  Controller,
  Get,
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
import { User } from '../users/domain/user.entity';
import { UserRole } from '../users/domain/user-role.enum';
import {
  AlfajorResponseDto,
  PaginatedAlfajoresDto,
} from './dto/alfajor-response.dto';
import { CreateAlfajorDto } from './dto/create-alfajor.dto';
import { SearchAlfajoresDto } from './dto/search-alfajores.dto';
import { UpdateAlfajorDto } from './dto/update-alfajor.dto';
import { AlfajorCreator } from './services/alfajor-creator';
import { AlfajorFinder } from './services/alfajor-finder';
import { AlfajorImageUpdater } from './services/alfajor-image-updater';
import { AlfajorSearcher } from './services/alfajor-searcher';
import { AlfajorUpdater } from './services/alfajor-updater';

@ApiTags('alfajores')
@Controller('alfajores')
export class AlfajoresController {
  constructor(
    private readonly creator: AlfajorCreator,
    private readonly finder: AlfajorFinder,
    private readonly searcher: AlfajorSearcher,
    private readonly updater: AlfajorUpdater,
    private readonly imageUpdater: AlfajorImageUpdater,
  ) {}

  @Get()
  async search(
    @Query() dto: SearchAlfajoresDto,
    @CurrentUser() user?: User,
  ): Promise<PaginatedAlfajoresDto> {
    const includeAllStatuses = user?.role === UserRole.ADMIN;
    const { items, total, page, limit } = await this.searcher.execute(dto, {
      includeAllStatuses,
    });
    return {
      items: items.map((a) => AlfajorResponseDto.from(a)),
      total,
      page,
      limit,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AlfajorResponseDto> {
    const { alfajor, avgRating, avgEjes } =
      await this.finder.byIdWithAverages(id);
    return AlfajorResponseDto.from(alfajor, avgRating, avgEjes);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateAlfajorDto,
    @CurrentUser() user: User,
  ): Promise<AlfajorResponseDto> {
    return AlfajorResponseDto.from(await this.creator.execute(dto, user.id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlfajorDto,
    @CurrentUser() user: User,
  ): Promise<AlfajorResponseDto> {
    const updated = await this.updater.execute(id, dto, {
      id: user.id,
      role: user.role,
    });
    return AlfajorResponseDto.from(updated);
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
  @Post(':id/imagen')
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<AlfajorResponseDto> {
    const updated = await this.imageUpdater.execute(id, file.buffer, {
      id: user.id,
      role: user.role,
    });
    return AlfajorResponseDto.from(updated);
  }
}
