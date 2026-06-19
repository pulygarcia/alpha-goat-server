import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 280 })
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  contenido: string;
}
