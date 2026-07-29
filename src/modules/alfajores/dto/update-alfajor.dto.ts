import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAlfajorDto } from './create-alfajor.dto';

// no se permite cambiar la marca de un alfajor (ni la del catálogo ni la
// propuesta en texto libre); si se equivocó, se crea otro
export class UpdateAlfajorDto extends PartialType(
  OmitType(CreateAlfajorDto, ['marcaId', 'marcaNombre'] as const),
) {}
