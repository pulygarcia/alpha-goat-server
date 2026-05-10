import { ApiProperty } from '@nestjs/swagger';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';

export class AlfajorResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() marcaId: string;
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
