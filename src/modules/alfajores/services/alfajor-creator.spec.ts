import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marca } from '../../marcas/domain/marca.entity';
import { MarcaFinder } from '../../marcas/services/marca-finder';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';
import { AlfajorCreator } from './alfajor-creator';
import { AlfajorDuplicateChecker } from './alfajor-duplicate-checker';

describe('AlfajorCreator', () => {
  let creator: AlfajorCreator;
  let repo: jest.Mocked<Repository<Alfajor>>;
  let marcaFinder: jest.Mocked<MarcaFinder>;
  let duplicateChecker: jest.Mocked<AlfajorDuplicateChecker>;

  const dto = {
    nombre: 'Jorgito',
    marcaId: 'm1',
    tipo: AlfajorTipo.CHOCOLATE,
  };

  const freeDto = {
    nombre: 'Doñita',
    marcaNombre: 'Alfajores Doña Pepa',
    tipo: AlfajorTipo.CHOCOLATE,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorCreator,
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        { provide: MarcaFinder, useValue: { byId: jest.fn() } },
        {
          provide: AlfajorDuplicateChecker,
          useValue: { assertUnique: jest.fn() },
        },
      ],
    }).compile();

    creator = module.get(AlfajorCreator);
    repo = module.get(getRepositoryToken(Alfajor));
    marcaFinder = module.get(MarcaFinder);
    duplicateChecker = module.get(AlfajorDuplicateChecker);
  });

  const mockSave = () => {
    const created = { id: 'a1', status: AlfajorStatus.PENDING } as Alfajor;
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue(created);
    return created;
  };

  it('creates a PENDING alfajor with createdById', async () => {
    marcaFinder.byId.mockResolvedValue({ id: 'm1' } as Marca);
    mockSave();

    const result = await creator.execute(dto, 'u1');

    expect(result.status).toBe(AlfajorStatus.PENDING);
    expect(repo.create).toHaveBeenCalledWith({
      nombre: 'Jorgito',
      tipo: AlfajorTipo.CHOCOLATE,
      marcaId: 'm1',
      marcaNombrePropuesto: null,
      status: AlfajorStatus.PENDING,
      createdById: 'u1',
    });
    expect(duplicateChecker.assertUnique).toHaveBeenCalledWith('Jorgito', 'm1');
  });

  it('propagates NotFoundException when marca does not exist', async () => {
    marcaFinder.byId.mockRejectedValue(new NotFoundException());
    await expect(creator.execute(dto, 'u1')).rejects.toThrow(NotFoundException);
  });

  it('propagates ConflictException on duplicate (nombre, marcaId)', async () => {
    marcaFinder.byId.mockResolvedValue({ id: 'm1' } as Marca);
    duplicateChecker.assertUnique.mockRejectedValue(new ConflictException());

    await expect(creator.execute(dto, 'u1')).rejects.toThrow(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('creates a marca-less proposal when the marca comes as free text', async () => {
    mockSave();

    await creator.execute(freeDto, 'u1');

    expect(marcaFinder.byId).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith({
      nombre: 'Doñita',
      tipo: AlfajorTipo.CHOCOLATE,
      marcaId: null,
      marcaNombrePropuesto: 'Alfajores Doña Pepa',
      status: AlfajorStatus.PENDING,
      createdById: 'u1',
    });
  });

  it('skips the duplicate check for a free-text marca', async () => {
    mockSave();

    await creator.execute(freeDto, 'u1');

    // Sin marca no hay par (nombre, marcaId) que comparar: el duplicado se
    // detecta al aprobar, cuando la marca ya está resuelta.
    expect(duplicateChecker.assertUnique).not.toHaveBeenCalled();
  });

  it('keeps optional fields on a free-text proposal', async () => {
    mockSave();

    await creator.execute(
      { ...freeDto, descripcion: 'rica', imagenUrl: 'https://cdn/x.png' },
      'u1',
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: 'rica',
        imagenUrl: 'https://cdn/x.png',
      }),
    );
  });
});
