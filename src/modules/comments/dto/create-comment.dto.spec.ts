import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';

describe('CreateCommentDto', () => {
  const validate = (contenido: string) =>
    validateSync(plainToInstance(CreateCommentDto, { contenido }));

  it('accepts contenido of exactly 280 characters', () => {
    expect(validate('a'.repeat(280))).toHaveLength(0);
  });

  it('rejects contenido longer than 280 characters', () => {
    const errors = validate('a'.repeat(281));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });
});
