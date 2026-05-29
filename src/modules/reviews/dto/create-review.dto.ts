import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const rating = () => [
  IsNumber({ maxDecimalPlaces: 1 }),
  Min(0),
  Max(10),
  Type(() => Number),
];

function Rating() {
  const decorators = rating();
  return (target: object, key: string) =>
    decorators.forEach((d) => d(target, key));
}

export class CreateReviewDto {
  @ApiProperty()
  @IsUUID()
  alfajorId: string;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @Rating()
  ratingGeneral: number;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @Rating()
  dulzor: number;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @Rating()
  cantidadDDL: number;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @Rating()
  calidadBano: number;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @Rating()
  ratioTapaRelleno: number;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @Rating()
  textura: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentario?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  fotoUrl?: string;
}
