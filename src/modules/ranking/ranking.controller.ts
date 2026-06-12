import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WeeklyRankingItemDto } from './dto/weekly-ranking-item.dto';
import { WeeklyRankingFinder } from './services/weekly-ranking-finder';

@ApiTags('ranking')
@Controller('ranking')
export class RankingController {
  constructor(private readonly weeklyFinder: WeeklyRankingFinder) {}

  @Get('weekly')
  @ApiOperation({
    summary: 'Top alfajores de la semana para el rail del feed',
  })
  @ApiResponse({ status: 200, type: [WeeklyRankingItemDto] })
  async weekly(): Promise<WeeklyRankingItemDto[]> {
    const rows = await this.weeklyFinder.execute();
    return rows.map((row) => WeeklyRankingItemDto.from(row));
  }
}
