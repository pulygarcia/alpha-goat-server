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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/domain/user.entity';
import {
  CommentResponseDto,
  PaginatedCommentsDto,
} from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SearchCommentsDto } from './dto/search-comments.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentCreator } from './services/comment-creator';
import { CommentFinder } from './services/comment-finder';
import { CommentLikeToggler } from './services/comment-like-toggler';
import { CommentRemover } from './services/comment-remover';
import { CommentSearcher } from './services/comment-searcher';
import { CommentUpdater } from './services/comment-updater';

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(
    private readonly creator: CommentCreator,
    private readonly finder: CommentFinder,
    private readonly searcher: CommentSearcher,
    private readonly updater: CommentUpdater,
    private readonly remover: CommentRemover,
    private readonly likes: CommentLikeToggler,
  ) {}

  @Get('reviews/:reviewId/comments')
  async search(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Query() dto: SearchCommentsDto,
  ): Promise<PaginatedCommentsDto> {
    const { items, total, page, limit } = await this.searcher.execute(
      reviewId,
      dto,
    );
    return {
      items: items.map((c) => CommentResponseDto.from(c)),
      total,
      page,
      limit,
    };
  }

  @Get('comments/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommentResponseDto> {
    return CommentResponseDto.from(await this.finder.byId(id));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reviews/:reviewId/comments')
  async create(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: User,
  ): Promise<CommentResponseDto> {
    return CommentResponseDto.from(
      await this.creator.execute(reviewId, dto, user.id),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('comments/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: User,
  ): Promise<CommentResponseDto> {
    return CommentResponseDto.from(
      await this.updater.execute(id, dto, user.id),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.remover.execute(id, { id: user.id, role: user.role });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('comments/:id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async like(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.likes.like(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlike(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.likes.unlike(id, user.id);
  }
}
