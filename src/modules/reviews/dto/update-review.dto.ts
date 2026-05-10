import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto';

// no se permite cambiar el alfajor reseñado
export class UpdateReviewDto extends PartialType(
  OmitType(CreateReviewDto, ['alfajorId'] as const),
) {}
