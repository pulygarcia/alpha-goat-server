import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';
import { AlfajorFinder } from './alfajor-finder';
import { AlfajorUpdater } from './alfajor-updater';

describe('AlfajorUpdater', () => {
  let updater: AlfajorUpdater;
  let repo: jest.Mocked<Repository<Alfajor>>;
  let finder: jest.Mocked<AlfajorFinder>;

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
    } as Alfajor);

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorUpdater,
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        { provide: AlfajorFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    updater = module.get(AlfajorUpdater);
    repo = module.get(getRepositoryToken(Alfajor));
    finder = module.get(AlfajorFinder);
  });

  it('owner can edit while PENDING', async () => {
    finder.byId.mockResolvedValue(baseAlfajor());
    repo.findOne.mockResolvedValue(null);
    repo.save.mockImplementation(async (a) => a as Alfajor);

    const result = await updater.execute(
      'a1',
      { nombre: 'New', descripcion: 'd' },
      { id: 'u1', role: UserRole.USER },
    );

    expect(result.nombre).toBe('New');
    expect(result.descripcion).toBe('d');
  });

  it('owner cannot edit once APPROVED', async () => {
    finder.byId.mockResolvedValue(baseAlfajor({ status: AlfajorStatus.APPROVED }));

    await expect(
      updater.execute('a1', { nombre: 'New' }, { id: 'u1', role: UserRole.USER }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('non-owner non-admin cannot edit', async () => {
    finder.byId.mockResolvedValue(baseAlfajor());

    await expect(
      updater.execute('a1', { nombre: 'New' }, { id: 'other', role: UserRole.USER }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('admin can edit any alfajor regardless of status', async () => {
    finder.byId.mockResolvedValue(baseAlfajor({ status: AlfajorStatus.APPROVED }));
    repo.findOne.mockResolvedValue(null);
    repo.save.mockImplementation(async (a) => a as Alfajor);

    const result = await updater.execute(
      'a1',
      { nombre: 'New' },
      { id: 'admin', role: UserRole.ADMIN },
    );

    expect(result.nombre).toBe('New');
  });

  it('throws ConflictException on duplicate (nombre, marcaId)', async () => {
    finder.byId.mockResolvedValue(baseAlfajor());
    repo.findOne.mockResolvedValue({ id: 'other' } as Alfajor);

    await expect(
      updater.execute('a1', { nombre: 'Taken' }, { id: 'u1', role: UserRole.USER }),
    ).rejects.toThrow(ConflictException);
  });

  it('skips uniqueness check when nombre unchanged', async () => {
    const alf = baseAlfajor({ nombre: 'Same' });
    finder.byId.mockResolvedValue(alf);
    repo.save.mockResolvedValue(alf);

    await updater.execute('a1', { nombre: 'Same' }, { id: 'u1', role: UserRole.USER });

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('saves untouched alfajor when dto is empty', async () => {
    const alf = baseAlfajor();
    finder.byId.mockResolvedValue(alf);
    repo.save.mockResolvedValue(alf);

    await updater.execute('a1', {}, { id: 'u1', role: UserRole.USER });

    expect(repo.save).toHaveBeenCalledWith(alf);
  });
});
