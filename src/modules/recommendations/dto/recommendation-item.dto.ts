import { ApiProperty } from '@nestjs/swagger';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';
import { RecommendationRow } from '../services/recommendation-finder';

class RecommendationMarcaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
}

export class RecommendationItemDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ enum: AlfajorTipo }) tipo: AlfajorTipo;
  /** Afinidad con tu gusto, 0..100; `null` en el fallback de cold start. */
  @ApiProperty({ nullable: true, type: Number }) matchPct: number | null;
  /** Fuerza de recomendación: mezcla de afinidad y calidad. */
  @ApiProperty() score: number;
  @ApiProperty({ type: RecommendationMarcaDto })
  marca: RecommendationMarcaDto;

  static from(row: RecommendationRow): RecommendationItemDto {
    const dto = new RecommendationItemDto();
    dto.id = row.alfajor.id;
    dto.nombre = row.alfajor.nombre;
    dto.tipo = row.alfajor.tipo;
    dto.matchPct = row.matchPct;
    dto.score = row.score;
    dto.marca = {
      id: row.alfajor.marca?.id ?? row.alfajor.marcaId,
      nombre: row.alfajor.marca?.nombre ?? '',
      logoUrl: row.alfajor.marca?.logoUrl ?? null,
    };
    return dto;
  }
}
