import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateReviewDto } from './create-review.dto';

describe('CreateReviewDto', () => {
  const base = {
    alfajorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ratingGeneral: 8,
    dulzor: 8,
    cantidadDDL: 8,
    calidadBano: 8,
    ratioTapaRelleno: 8,
    textura: 8,
  };

  const validate = (comentario?: string) =>
    validateSync(plainToInstance(CreateReviewDto, { ...base, comentario }));

  it('accepts a missing comentario (optional)', () => {
    expect(validateSync(plainToInstance(CreateReviewDto, base))).toHaveLength(
      0,
    );
  });

  it('accepts comentario of exactly 280 characters', () => {
    expect(validate('a'.repeat(280))).toHaveLength(0);
  });

  it('rejects comentario longer than 280 characters', () => {
    const errors = validate('a'.repeat(281));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });
});
