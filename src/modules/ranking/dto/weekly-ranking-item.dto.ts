import { ApiProperty } from '@nestjs/swagger';
import {
  WeeklyRankingRow,
  WeeklyTrend,
} from '../services/weekly-ranking-finder';

class WeeklyRankingMarcaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
}

export class WeeklyRankingItemDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  /** Promedio de ratingGeneral de la semana, 2 decimales. */
  @ApiProperty() score: number;
  /** Dirección vs la semana anterior; `new` si no tenía reviews. */
  @ApiProperty({ enum: ['up', 'down', 'same', 'new'] })
  trend: WeeklyTrend;
  @ApiProperty({ type: WeeklyRankingMarcaDto })
  marca: WeeklyRankingMarcaDto;

  static from(row: WeeklyRankingRow): WeeklyRankingItemDto {
    const dto = new WeeklyRankingItemDto();
    dto.id = row.alfajor.id;
    dto.nombre = row.alfajor.nombre;
    dto.score = row.score;
    dto.trend = row.trend;
    dto.marca = {
      id: row.alfajor.marca?.id ?? row.alfajor.marcaId,
      nombre: row.alfajor.marca?.nombre ?? '',
      logoUrl: row.alfajor.marca?.logoUrl ?? null,
    };
    return dto;
  }
}
