import { ApiProperty } from '@nestjs/swagger';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';
import { GlobalRankingRow } from '../services/global-ranking-finder';

class RankingMarcaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
}

/** Un alfajor del ranking global. La posición la deriva el cliente del offset. */
export class RankingItemDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ enum: AlfajorTipo }) tipo: AlfajorTipo;
  /** Promedio histórico de ratingGeneral, 2 decimales. */
  @ApiProperty() score: number;
  @ApiProperty() reviewsCount: number;
  @ApiProperty({ type: RankingMarcaDto }) marca: RankingMarcaDto;

  static from(row: GlobalRankingRow): RankingItemDto {
    const dto = new RankingItemDto();
    dto.id = row.alfajor.id;
    dto.nombre = row.alfajor.nombre;
    dto.tipo = row.alfajor.tipo;
    dto.score = row.score;
    dto.reviewsCount = row.reviewsCount;
    dto.marca = {
      // El ranking solo trae alfajores APPROVED, que siempre tienen marca.
      id: row.alfajor.marca?.id ?? row.alfajor.marcaId ?? '',
      nombre: row.alfajor.marca?.nombre ?? '',
      logoUrl: row.alfajor.marca?.logoUrl ?? null,
    };
    return dto;
  }
}

/**
 * El peor votado (`GET /ranking/worst`): espejo de `RankingItemDto` +
 * `imagenUrl` (la card "escándalo" del feed muestra la foto del alfajor).
 */
export class WorstRankingItemDto extends RankingItemDto {
  @ApiProperty({ nullable: true }) imagenUrl: string | null;

  static from(row: GlobalRankingRow): WorstRankingItemDto {
    const dto = Object.assign(
      new WorstRankingItemDto(),
      RankingItemDto.from(row),
    );
    dto.imagenUrl = row.alfajor.imagenUrl ?? null;
    return dto;
  }
}

export class PaginatedRankingDto {
  @ApiProperty({ type: [RankingItemDto] }) items: RankingItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
