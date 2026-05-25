import { ApiProperty } from '@nestjs/swagger';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';

export class FeedHeroMarcaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) provincia: string | null;
}

export class FeedHeroAlfajorDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ enum: AlfajorTipo }) tipo: AlfajorTipo;
  @ApiProperty({ nullable: true }) imagenUrl: string | null;
  @ApiProperty({ type: FeedHeroMarcaDto }) marca: FeedHeroMarcaDto;
}

export class FeedHeroRatingsDto {
  @ApiProperty() general: number;
  @ApiProperty() dulzor: number;
  @ApiProperty() cantidadDDL: number;
  @ApiProperty() calidadBano: number;
  @ApiProperty() ratioTapaRelleno: number;
  @ApiProperty() textura: number;
}

export class FeedHeroStatsDto {
  @ApiProperty() reviewsThisWeek: number;
  @ApiProperty() reviewsLastWeek: number;
  @ApiProperty({ nullable: true, description: 'null cuando reviewsLastWeek = 0' })
  deltaPct: number | null;
  @ApiProperty() totalReviews: number;
}

export class FeedHeroPeriodDto {
  @ApiProperty() from: string;
  @ApiProperty() to: string;
}

export class FeedHeroResponseDto {
  @ApiProperty({ type: FeedHeroAlfajorDto }) alfajor: FeedHeroAlfajorDto;
  @ApiProperty({ type: FeedHeroRatingsDto }) ratings: FeedHeroRatingsDto;
  @ApiProperty({ type: FeedHeroStatsDto }) stats: FeedHeroStatsDto;
  @ApiProperty({ type: FeedHeroPeriodDto }) period: FeedHeroPeriodDto;
}
