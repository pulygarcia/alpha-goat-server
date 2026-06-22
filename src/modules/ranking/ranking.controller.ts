import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRankingQueryDto } from './dto/global-ranking-query.dto';
import { PaginatedRankingDto, RankingItemDto } from './dto/ranking-item.dto';
import { WeeklyRankingItemDto } from './dto/weekly-ranking-item.dto';
import { GlobalRankingFinder } from './services/global-ranking-finder';
import { WeeklyRankingFinder } from './services/weekly-ranking-finder';

@ApiTags('ranking')
@Controller('ranking')
export class RankingController {
  constructor(
    private readonly weeklyFinder: WeeklyRankingFinder,
    private readonly globalFinder: GlobalRankingFinder,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Ranking global (all-time) de alfajores, paginado',
  })
  @ApiResponse({ status: 200, type: PaginatedRankingDto })
  async global(
    @Query() dto: GlobalRankingQueryDto,
  ): Promise<PaginatedRankingDto> {
    const { rows, total, page, limit } = await this.globalFinder.execute(
      dto.page,
      dto.limit,
    );
    return {
      items: rows.map((row) => RankingItemDto.from(row)),
      total,
      page,
      limit,
    };
  }

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
