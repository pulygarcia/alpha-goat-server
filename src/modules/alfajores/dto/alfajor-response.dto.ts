import { ApiProperty } from '@nestjs/swagger';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';

class AlfajorMarcaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) provincia: string | null;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
}

export class AlfajorResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() marcaId: string;
  /** Marca anidada cuando la relación está cargada; `null` si no se pidió. */
  @ApiProperty({ type: AlfajorMarcaDto, nullable: true })
  marca: AlfajorMarcaDto | null;
  @ApiProperty({ enum: AlfajorTipo }) tipo: AlfajorTipo;
  @ApiProperty({ nullable: true }) descripcion: string | null;
  @ApiProperty({ nullable: true }) imagenUrl: string | null;
  @ApiProperty({ enum: AlfajorStatus }) status: AlfajorStatus;
  @ApiProperty({ nullable: true }) rejectionReason: string | null;
  @ApiProperty({ nullable: true }) createdById: string | null;
  @ApiProperty() createdAt: Date;

  static from(a: Alfajor): AlfajorResponseDto {
    const dto = new AlfajorResponseDto();
    dto.id = a.id;
    dto.nombre = a.nombre;
    dto.marcaId = a.marcaId;
    dto.marca = a.marca
      ? {
          id: a.marca.id,
          nombre: a.marca.nombre,
          provincia: a.marca.provincia,
          logoUrl: a.marca.logoUrl,
        }
      : null;
    dto.tipo = a.tipo;
    dto.descripcion = a.descripcion;
    dto.imagenUrl = a.imagenUrl;
    dto.status = a.status;
    dto.rejectionReason = a.rejectionReason;
    dto.createdById = a.createdById;
    dto.createdAt = a.createdAt;
    return dto;
  }
}

export class PaginatedAlfajoresDto {
  @ApiProperty({ type: [AlfajorResponseDto] }) items: AlfajorResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
