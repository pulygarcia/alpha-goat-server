import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalStatsResponseDto } from './dto/global-stats-response.dto';
import { GlobalStatsFinder } from './services/global-stats-finder';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly finder: GlobalStatsFinder) {}

  @Get('global')
  @ApiOperation({ summary: 'Contadores globales públicos de la app' })
  @ApiResponse({ status: 200, type: GlobalStatsResponseDto })
  async global(): Promise<GlobalStatsResponseDto> {
    const result = await this.finder.execute();
    return GlobalStatsResponseDto.from(result);
  }
}
