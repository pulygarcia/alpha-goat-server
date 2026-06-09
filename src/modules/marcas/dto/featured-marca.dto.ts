import { ApiProperty } from '@nestjs/swagger';
import { Marca } from '../domain/marca.entity';

export class FeaturedMarcaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) provincia: string | null;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
  /** Cantidad histórica de alfajores APPROVED de la marca. */
  @ApiProperty() productCount: number;
  /** Promedio histórico de ratingGeneral de la marca. */
  @ApiProperty() avgScore: number;

  static from(
    marca: Marca,
    stats: { productCount: number; avgScore: number },
  ): FeaturedMarcaDto {
    const dto = new FeaturedMarcaDto();
    dto.id = marca.id;
    dto.nombre = marca.nombre;
    dto.provincia = marca.provincia;
    dto.logoUrl = marca.logoUrl;
    dto.productCount = stats.productCount;
    dto.avgScore = stats.avgScore;
    return dto;
  }
}
