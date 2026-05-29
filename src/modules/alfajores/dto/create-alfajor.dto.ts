import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
} from 'class-validator';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';

export class CreateAlfajorDto {
  @ApiProperty({ minLength: 2, maxLength: 150 })
  @IsString()
  @Length(2, 150)
  nombre: string;

  @ApiProperty()
  @IsUUID()
  marcaId: string;

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
