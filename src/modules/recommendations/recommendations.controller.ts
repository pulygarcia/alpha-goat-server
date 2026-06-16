import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/domain/user.entity';
import { RecommendationItemDto } from './dto/recommendation-item.dto';
import { RecommendationsQueryDto } from './dto/recommendations-query.dto';
import { RecommendationFinder } from './services/recommendation-finder';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly finder: RecommendationFinder) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Alfajores recomendados para el usuario (rail del feed)',
  })
  @ApiResponse({ status: 200, type: [RecommendationItemDto] })
  async list(
    @Query() query: RecommendationsQueryDto,
    @CurrentUser() user: User,
  ): Promise<RecommendationItemDto[]> {
    const rows = await this.finder.execute(user.id, query.limit);
    return rows.map((row) => RecommendationItemDto.from(row));
  }
}
