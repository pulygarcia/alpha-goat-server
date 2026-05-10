import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginatedReviewsDto, ReviewResponseDto } from './dto/review-response.dto';
import { SearchReviewsDto } from './dto/search-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewCreator } from './services/review-creator';
import { ReviewFinder } from './services/review-finder';
import { ReviewRemover } from './services/review-remover';
import { ReviewSearcher } from './services/review-searcher';
import { ReviewUpdater } from './services/review-updater';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly creator: ReviewCreator,
    private readonly finder: ReviewFinder,
    private readonly searcher: ReviewSearcher,
    private readonly updater: ReviewUpdater,
    private readonly remover: ReviewRemover,
  ) {}

  @Get()
  async search(@Query() dto: SearchReviewsDto): Promise<PaginatedReviewsDto> {
    const { items, total, page, limit } = await this.searcher.execute(dto);
    return { items: items.map(ReviewResponseDto.from), total, page, limit };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(await this.finder.byId(id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: User,
  ): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(await this.creator.execute(dto, user.id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: User,
  ): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(await this.updater.execute(id, dto, user.id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.remover.execute(id, { id: user.id, role: user.role });
  }
}
