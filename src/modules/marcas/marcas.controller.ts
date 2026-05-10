import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarcaResponseDto, PaginatedMarcasDto } from './dto/marca-response.dto';
import { SearchMarcasDto } from './dto/search-marcas.dto';
import { MarcaFinder } from './services/marca-finder';
import { MarcaSearcher } from './services/marca-searcher';

@ApiTags('marcas')
@Controller('marcas')
export class MarcasController {
  constructor(
    private readonly finder: MarcaFinder,
    private readonly searcher: MarcaSearcher,
  ) {}

  @Get()
  async search(@Query() dto: SearchMarcasDto): Promise<PaginatedMarcasDto> {
    const { items, total, page, limit } = await this.searcher.execute(dto);
    return { items: items.map(MarcaResponseDto.from), total, page, limit };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MarcaResponseDto> {
    return MarcaResponseDto.from(await this.finder.byId(id));
  }
}
