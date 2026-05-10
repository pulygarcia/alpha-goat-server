import { ApiProperty } from '@nestjs/swagger';
import { Marca } from '../domain/marca.entity';

export class MarcaResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) provincia: string | null;
  @ApiProperty({ nullable: true }) descripcion: string | null;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
  @ApiProperty() createdAt: Date;

  static from(marca: Marca): MarcaResponseDto {
    const dto = new MarcaResponseDto();
    dto.id = marca.id;
    dto.nombre = marca.nombre;
    dto.provincia = marca.provincia;
    dto.descripcion = marca.descripcion;
    dto.logoUrl = marca.logoUrl;
    dto.createdAt = marca.createdAt;
    return dto;
  }
}

export class PaginatedMarcasDto {
  @ApiProperty({ type: [MarcaResponseDto] }) items: MarcaResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
