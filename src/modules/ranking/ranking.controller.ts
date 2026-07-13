import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GlobalRankingQueryDto } from './dto/global-ranking-query.dto';
import {
  PaginatedRankingDto,
  RankingItemDto,
  WorstRankingItemDto,
} from './dto/ranking-item.dto';
import { WeeklyRankingItemDto } from './dto/weekly-ranking-item.dto';
import { GlobalRankingFinder } from './services/global-ranking-finder';
import { WeeklyRankingFinder } from './services/weekly-ranking-finder';
import { WorstRankedFinder } from './services/worst-ranked-finder';

@ApiTags('ranking')
@Controller('ranking')
export class RankingController {
  constructor(
    private readonly weeklyFinder: WeeklyRankingFinder,
    private readonly globalFinder: GlobalRankingFinder,
    private readonly worstFinder: WorstRankedFinder,
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

  @Get('worst')
  @ApiOperation({
    summary: 'El peor votado all-time (piso 5 reseñas)',
  })
  @ApiResponse({ status: 200, type: WorstRankingItemDto })
  @ApiResponse({ status: 204, description: 'Ningún alfajor califica' })
  @HttpCode(HttpStatus.OK)
  async worst(
    @Res({ passthrough: true }) res: Response,
  ): Promise<WorstRankingItemDto | void> {
    const row = await this.worstFinder.execute();
    // 204 cuando ningún alfajor llega al piso de reseñas: la card del feed
    // se autooculta en vez de mostrar un "peor" con muestra chica.
    if (!row) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }
    return WorstRankingItemDto.from(row);
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
