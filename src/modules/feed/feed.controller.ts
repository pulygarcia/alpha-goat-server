import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FeedHeroResponseDto } from './dto/feed-hero-response.dto';
import { FeedHeroFinder, FeedHeroResult } from './services/feed-hero-finder';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly heroFinder: FeedHeroFinder) {}

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
    return toDto(result);
  }
}

function toDto(r: FeedHeroResult): FeedHeroResponseDto {
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
