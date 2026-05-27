import { ApiProperty } from '@nestjs/swagger';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';

export class FeedAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
}

export class FeedAlfajorDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ enum: AlfajorTipo }) tipo: AlfajorTipo;
  @ApiProperty({ nullable: true }) imagenUrl: string | null;
}

export class FeedMarcaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) provincia: string | null;
}

export class FeedAxesDto {
  @ApiProperty() dulzor: number;
  @ApiProperty() cantidadDDL: number;
  @ApiProperty() calidadBano: number;
  @ApiProperty() ratioTapaRelleno: number;
  @ApiProperty() textura: number;
}

export class FeedItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: FeedAuthorDto }) author: FeedAuthorDto;
  @ApiProperty({ type: FeedAlfajorDto }) alfajor: FeedAlfajorDto;
  @ApiProperty({ type: FeedMarcaDto }) marca: FeedMarcaDto;
  @ApiProperty({ nullable: true, description: 'comentario de la review' })
  quote: string | null;
  @ApiProperty({ nullable: true }) photoUrl: string | null;
  @ApiProperty({ description: 'ratingGeneral' }) overall: number;
  @ApiProperty({ type: FeedAxesDto }) axes: FeedAxesDto;
  @ApiProperty() likes: number;
  @ApiProperty() commentsCount: number;
  @ApiProperty() createdAt: Date;
}

export class FeedListDto {
  @ApiProperty({ type: [FeedItemDto] }) items: FeedItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
