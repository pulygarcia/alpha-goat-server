import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';
import { IsValidMarcaSource } from './marca-source.validator';

export class CreateAlfajorDto {
  @ApiProperty({ minLength: 2, maxLength: 150 })
  @IsString()
  @Length(2, 150)
  nombre: string;

  /** Marca del catálogo. Excluyente con `marcaNombre`. */
  @ApiPropertyOptional()
  @ValidateIf((o: CreateAlfajorDto) => o.marcaId !== undefined)
  @IsUUID()
  marcaId?: string;

  /**
   * Marca en texto libre cuando no está en el catálogo: el alfajor queda
   * PENDING sin marca y el admin la resuelve al aprobar.
   */
  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  @IsValidMarcaSource()
  marcaNombre?: string;

  @ApiProperty({ enum: AlfajorTipo })
  @IsEnum(AlfajorTipo)
  tipo: AlfajorTipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imagenUrl?: string;
}
