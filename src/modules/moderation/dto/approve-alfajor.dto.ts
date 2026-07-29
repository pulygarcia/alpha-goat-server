import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ApproveAlfajorDto {
  /**
   * Marca del catálogo con la que el admin resuelve una propuesta de marca
   * libre. Sin esto se crea (o se reusa) la marca del nombre propuesto.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  marcaId?: string;
}
