import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/domain/user.entity';
import { FeedHeroResponseDto } from './dto/feed-hero-response.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { FeedItemDto, FeedListDto } from './dto/feed-response.dto';
import { FeedFinder, FeedRow } from './services/feed-finder';
import { FeedHeroFinder, FeedHeroResult } from './services/feed-hero-finder';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(
    private readonly heroFinder: FeedHeroFinder,
    private readonly finder: FeedFinder,
  ) {}

  @Get('hero')
  @ApiOperation({ summary: 'Pick editorial del feed (alfajor destacado + stats semanales)' })
  @ApiResponse({ status: 200, type: FeedHeroResponseDto })
  @ApiResponse({ status: 204, description: 'No hay reviews todavía' })
  @HttpCode(HttpStatus.OK)
  async hero(@Res({ passthrough: true }) res: Response): Promise<FeedHeroResponseDto | void> {
    const result = await this.heroFinder.execute();
    // 204 cuando todavía no hay reviews en el sistema. El front renderiza un
    // empty-state en vez de loading infinito.
    if (!result) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }
    return toHeroDto(result);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lista paginada de reseñas del feed (scope + sort)' })
  @ApiResponse({ status: 200, type: FeedListDto })
  async list(@Query() dto: FeedQueryDto, @CurrentUser() user: User): Promise<FeedListDto> {
    const { rows, total, page, limit } = await this.finder.execute(dto, user.id);
    return { items: rows.map(toItemDto), total, page, limit };
  }
}

function toItemDto(row: FeedRow): FeedItemDto {
  const r = row.review;
  return {
    id: r.id,
    author: {
      id: r.user!.id,
      username: r.user!.username,
      avatarUrl: r.user!.avatarUrl,
    },
    alfajor: {
      id: r.alfajor!.id,
      nombre: r.alfajor!.nombre,
      tipo: r.alfajor!.tipo,
      imagenUrl: r.alfajor!.imagenUrl,
    },
    marca: {
      id: r.alfajor!.marca!.id,
      nombre: r.alfajor!.marca!.nombre,
      provincia: r.alfajor!.marca!.provincia,
    },
    quote: r.comentario,
    photoUrl: r.fotoUrl,
    overall: r.ratingGeneral,
    axes: {
      dulzor: r.dulzor,
      cantidadDDL: r.cantidadDDL,
      calidadBano: r.calidadBano,
      ratioTapaRelleno: r.ratioTapaRelleno,
      textura: r.textura,
    },
    likes: row.likes,
    commentsCount: row.commentsCount,
    createdAt: r.createdAt,
  };
}

function toHeroDto(r: FeedHeroResult): FeedHeroResponseDto {
  return {
    alfajor: {
      id: r.alfajor.id,
      nombre: r.alfajor.nombre,
      tipo: r.alfajor.tipo,
      imagenUrl: r.alfajor.imagenUrl,
      marca: {
        id: r.alfajor.marca!.id,
        nombre: r.alfajor.marca!.nombre,
        provincia: r.alfajor.marca!.provincia,
      },
    },
    ratings: r.ratings,
    stats: r.stats,
    period: { from: r.period.from.toISOString(), to: r.period.to.toISOString() },
  };
}
