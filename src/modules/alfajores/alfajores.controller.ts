import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/domain/user.entity';
import { UserRole } from '../users/domain/user-role.enum';
import { AlfajorResponseDto, PaginatedAlfajoresDto } from './dto/alfajor-response.dto';
import { CreateAlfajorDto } from './dto/create-alfajor.dto';
import { SearchAlfajoresDto } from './dto/search-alfajores.dto';
import { UpdateAlfajorDto } from './dto/update-alfajor.dto';
import { AlfajorCreator } from './services/alfajor-creator';
import { AlfajorFinder } from './services/alfajor-finder';
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
    return { items: items.map(AlfajorResponseDto.from), total, page, limit };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AlfajorResponseDto> {
    return AlfajorResponseDto.from(await this.finder.byId(id));
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
    const updated = await this.updater.execute(id, dto, { id: user.id, role: user.role });
    return AlfajorResponseDto.from(updated);
  }
}
