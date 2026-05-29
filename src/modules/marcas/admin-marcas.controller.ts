import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/domain/user-role.enum';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { MarcaResponseDto } from './dto/marca-response.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { MarcaCreator } from './services/marca-creator';
import { MarcaUpdater } from './services/marca-updater';

@ApiTags('admin/marcas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/marcas')
export class AdminMarcasController {
  constructor(
    private readonly creator: MarcaCreator,
    private readonly updater: MarcaUpdater,
  ) {}

  @Post()
  async create(@Body() dto: CreateMarcaDto): Promise<MarcaResponseDto> {
    return MarcaResponseDto.from(await this.creator.execute(dto));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarcaDto,
  ): Promise<MarcaResponseDto> {
    return MarcaResponseDto.from(await this.updater.execute(id, dto));
  }
}
