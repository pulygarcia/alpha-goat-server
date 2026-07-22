import { AlfajorResponseDto } from './alfajor-response.dto';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';

function buildAlfajor(over: Partial<Alfajor> = {}): Alfajor {
  return {
    id: 'a1',
    nombre: 'Jorgito',
    marcaId: 'm1',
    tipo: AlfajorTipo.CHOCOLATE,
    descripcion: null,
    imagenUrl: null,
    status: AlfajorStatus.APPROVED,
    rejectionReason: null,
    createdById: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  } as unknown as Alfajor;
}

describe('AlfajorResponseDto.from', () => {
  it('maps the nested marca when the relation is loaded', () => {
    const a = buildAlfajor({
      marca: {
        id: 'm1',
        nombre: 'Jorgito',
        provincia: 'Córdoba',
        logoUrl: null,
      },
    } as Partial<Alfajor>);

    expect(AlfajorResponseDto.from(a).marca).toEqual({
      id: 'm1',
      nombre: 'Jorgito',
      provincia: 'Córdoba',
      logoUrl: null,
    });
  });

  it('leaves marca null when the relation is not loaded', () => {
    expect(AlfajorResponseDto.from(buildAlfajor()).marca).toBeNull();
  });

  it('sets avgRating when passed', () => {
    expect(AlfajorResponseDto.from(buildAlfajor(), 4.33).avgRating).toBe(4.33);
  });

  it('defaults avgRating to null when not passed', () => {
    expect(AlfajorResponseDto.from(buildAlfajor()).avgRating).toBeNull();
  });
});
