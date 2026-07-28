import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';
import { CreateAlfajorDto } from './create-alfajor.dto';

describe('CreateAlfajorDto', () => {
  const marcaId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const base = { nombre: 'Jorgito', tipo: AlfajorTipo.CHOCOLATE };

  const validate = (extra: Record<string, unknown>) =>
    validateSync(plainToInstance(CreateAlfajorDto, { ...base, ...extra }));

  it('accepts a proposal with an existing marcaId', () => {
    expect(validate({ marcaId })).toHaveLength(0);
  });

  it('accepts a proposal with a free-text marcaNombre', () => {
    expect(validate({ marcaNombre: 'Alfajores Doña Pepa' })).toHaveLength(0);
  });

  it('rejects a proposal with neither marcaId nor marcaNombre', () => {
    const errors = validate({});
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('marcaNombre');
  });

  it('rejects a proposal with both marcaId and marcaNombre', () => {
    const errors = validate({ marcaId, marcaNombre: 'Doña Pepa' });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('marcaNombre');
  });

  it('rejects a marcaId that is not a uuid', () => {
    const errors = validate({ marcaId: 'not-a-uuid' });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('marcaId');
  });

  it('rejects a marcaNombre shorter than 2 characters', () => {
    expect(validate({ marcaNombre: 'a' })).toHaveLength(1);
  });

  it('rejects a marcaNombre longer than 120 characters', () => {
    expect(validate({ marcaNombre: 'a'.repeat(121) })).toHaveLength(1);
  });

  it('rejects a non-string marcaNombre', () => {
    expect(validate({ marcaNombre: 42 })).toHaveLength(1);
  });
});
