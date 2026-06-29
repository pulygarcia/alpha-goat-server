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
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../../common/pipes/image-file.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { User } from '../users/domain/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  PaginatedReviewsDto,
  ReviewResponseDto,
} from './dto/review-response.dto';
import { SearchReviewsDto } from './dto/search-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewCreator } from './services/review-creator';
import { ReviewFinder } from './services/review-finder';
import { ReviewImageUpdater } from './services/review-image-updater';
import { ReviewLikeToggler } from './services/review-like-toggler';
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
    private readonly likes: ReviewLikeToggler,
    private readonly imageUpdater: ReviewImageUpdater,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async search(
    @Query() dto: SearchReviewsDto,
    @CurrentUser() user?: User,
  ): Promise<PaginatedReviewsDto> {
    const { items, total, page, limit } = await this.searcher.execute(
      dto,
      user?.id,
    );
    return {
      items: items.map((row) =>
        ReviewResponseDto.from(row.review, {
          likesCount: row.likesCount,
          commentsCount: row.commentsCount,
          isFollowing: row.isFollowing,
          isLiked: row.isLiked,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReviewResponseDto> {
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async like(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.likes.like(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlike(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.likes.unlike(id, user.id);
  }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':id/foto')
  async uploadFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(
      await this.imageUpdater.execute(id, file.buffer, user.id),
    );
  }
}
