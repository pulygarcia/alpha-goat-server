import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeaturedMarcaDto } from './dto/featured-marca.dto';
import { MarcaResponseDto, PaginatedMarcasDto } from './dto/marca-response.dto';
import { SearchMarcasDto } from './dto/search-marcas.dto';
import { MarcaFeaturedFinder } from './services/marca-featured-finder';
import { MarcaFinder } from './services/marca-finder';
import { MarcaSearcher } from './services/marca-searcher';

@ApiTags('marcas')
@Controller('marcas')
export class MarcasController {
  constructor(
    private readonly finder: MarcaFinder,
    private readonly searcher: MarcaSearcher,
    private readonly featuredFinder: MarcaFeaturedFinder,
  ) {}

  @Get()
  async search(@Query() dto: SearchMarcasDto): Promise<PaginatedMarcasDto> {
    const { items, total, page, limit } = await this.searcher.execute(dto);
    return {
      items: items.map((m) => MarcaResponseDto.from(m)),
      total,
      page,
      limit,
    };
  }

  // Debe declararse ANTES de `:id`, sino "featured" matchea la ruta param
  // (y encima falla el ParseUUIDPipe).
  @Get('featured')
  @ApiOperation({
    summary: 'Marcas en foco del rail del feed (por controversia)',
  })
  @ApiResponse({ status: 200, type: [FeaturedMarcaDto] })
  async featured(): Promise<FeaturedMarcaDto[]> {
    const rows = await this.featuredFinder.execute();
    return rows.map((row) => FeaturedMarcaDto.from(row.marca, row));
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MarcaResponseDto> {
    return MarcaResponseDto.from(await this.finder.byId(id));
  }
}
