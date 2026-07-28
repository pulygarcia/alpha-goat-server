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

// Promedio de cada eje sobre las reviews del alfajor. Las claves espejan
// las de ReviewRatings, que es lo que ya consume el front.
export class AvgEjesDto {
  @ApiProperty() dulzor: number;
  @ApiProperty() cantidadDDL: number;
  @ApiProperty() calidadBano: number;
  @ApiProperty() ratioTapaRelleno: number;
  @ApiProperty() textura: number;
}

export type AvgEjes = AvgEjesDto;

export class AlfajorResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  /** `null` solo en propuestas PENDING con marca libre. */
  @ApiProperty({ nullable: true }) marcaId: string | null;
  /** Marca pedida en texto libre; `null` en cuanto la marca está resuelta. */
  @ApiProperty({ nullable: true }) marcaNombrePropuesto: string | null;
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
  @ApiProperty({ nullable: true }) avgRating: number | null;
  /** `null` cuando el alfajor no tiene reseñas; nunca un objeto con nulls. */
  @ApiProperty({ type: AvgEjesDto, nullable: true })
  avgEjes: AvgEjes | null;

  static from(
    a: Alfajor,
    avgRating: number | null = null,
    avgEjes: AvgEjes | null = null,
  ): AlfajorResponseDto {
    const dto = new AlfajorResponseDto();
    dto.id = a.id;
    dto.nombre = a.nombre;
    dto.marcaId = a.marcaId;
    dto.marcaNombrePropuesto = a.marcaNombrePropuesto;
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
    dto.avgRating = avgRating;
    dto.avgEjes = avgEjes;
    return dto;
  }
}

export class PaginatedAlfajoresDto {
  @ApiProperty({ type: [AlfajorResponseDto] }) items: AlfajorResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
