import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/domain/user-role.enum';
import { Alfajor } from './alfajor.entity';
import { AlfajorStatus } from './alfajor-status.enum';
import { AlfajorTipo } from './alfajor-tipo.enum';
import { assertCanEditAlfajor } from './assert-can-edit-alfajor';

describe('assertCanEditAlfajor', () => {
  const baseAlfajor = (overrides: Partial<Alfajor> = {}): Alfajor =>
    ({
      id: 'a1',
      nombre: 'Old',
      marcaId: 'm1',
      tipo: AlfajorTipo.CHOCOLATE,
      descripcion: null,
      imagenUrl: null,
      status: AlfajorStatus.PENDING,
      createdById: 'u1',
      ...overrides,
    }) as Alfajor;

  it('allows the owner while PENDING', () => {
    expect(() =>
      assertCanEditAlfajor(baseAlfajor(), { id: 'u1', role: UserRole.USER }),
    ).not.toThrow();
  });

  it('allows an admin regardless of status or ownership', () => {
    expect(() =>
      assertCanEditAlfajor(
        baseAlfajor({ status: AlfajorStatus.APPROVED, createdById: 'other' }),
        { id: 'admin', role: UserRole.ADMIN },
      ),
    ).not.toThrow();
  });

  it('rejects the owner once APPROVED', () => {
    expect(() =>
      assertCanEditAlfajor(baseAlfajor({ status: AlfajorStatus.APPROVED }), {
        id: 'u1',
        role: UserRole.USER,
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects a non-owner non-admin', () => {
    expect(() =>
      assertCanEditAlfajor(baseAlfajor(), { id: 'other', role: UserRole.USER }),
    ).toThrow(ForbiddenException);
  });
});
