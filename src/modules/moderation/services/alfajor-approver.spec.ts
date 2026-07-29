import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';
import { AlfajorDuplicateChecker } from '../../alfajores/services/alfajor-duplicate-checker';
import { AlfajorFinder } from '../../alfajores/services/alfajor-finder';
import { Marca } from '../../marcas/domain/marca.entity';
import { MarcaCreator } from '../../marcas/services/marca-creator';
import { MarcaFinder } from '../../marcas/services/marca-finder';
import { AlfajorApprover } from './alfajor-approver';

describe('AlfajorApprover', () => {
  let approver: AlfajorApprover;
  let repo: jest.Mocked<Repository<Alfajor>>;
  let finder: jest.Mocked<AlfajorFinder>;
  let marcaFinder: jest.Mocked<MarcaFinder>;
  let marcaCreator: jest.Mocked<MarcaCreator>;
  let duplicateChecker: jest.Mocked<AlfajorDuplicateChecker>;

  const baseAlfajor = (overrides: Partial<Alfajor> = {}): Alfajor =>
    ({
      id: 'a1',
      nombre: 'X',
      marcaId: 'm1',
      marcaNombrePropuesto: null,
      tipo: AlfajorTipo.CHOCOLATE,
      status: AlfajorStatus.PENDING,
      rejectionReason: null,
      ...overrides,
    }) as Alfajor;

  const freeProposal = (overrides: Partial<Alfajor> = {}): Alfajor =>
    baseAlfajor({
      marcaId: null,
      marcaNombrePropuesto: 'Dona Pepa',
      ...overrides,
    });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorApprover,
        { provide: getRepositoryToken(Alfajor), useValue: { save: jest.fn() } },
        { provide: AlfajorFinder, useValue: { byId: jest.fn() } },
        {
          provide: MarcaFinder,
          useValue: { byId: jest.fn(), byNombre: jest.fn() },
        },
        { provide: MarcaCreator, useValue: { execute: jest.fn() } },
        {
          provide: AlfajorDuplicateChecker,
          useValue: { assertUnique: jest.fn() },
        },
      ],
    }).compile();

    approver = module.get(AlfajorApprover);
    repo = module.get(getRepositoryToken(Alfajor));
    finder = module.get(AlfajorFinder);
    marcaFinder = module.get(MarcaFinder);
    marcaCreator = module.get(MarcaCreator);
    duplicateChecker = module.get(AlfajorDuplicateChecker);
    repo.save.mockImplementation(async (a) => a as Alfajor);
  });

  it('approves a PENDING alfajor and clears rejectionReason', async () => {
    finder.byId.mockResolvedValue(baseAlfajor({ rejectionReason: 'stale' }));

    const result = await approver.execute('a1');

    expect(result.status).toBe(AlfajorStatus.APPROVED);
    expect(result.rejectionReason).toBeNull();
    expect(result.marcaId).toBe('m1');
    expect(marcaCreator.execute).not.toHaveBeenCalled();
    expect(marcaFinder.byNombre).not.toHaveBeenCalled();
  });

  it('throws BadRequest when alfajor is already APPROVED', async () => {
    finder.byId.mockResolvedValue(
      baseAlfajor({ status: AlfajorStatus.APPROVED }),
    );
    await expect(approver.execute('a1')).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws BadRequest when alfajor is REJECTED', async () => {
    finder.byId.mockResolvedValue(
      baseAlfajor({ status: AlfajorStatus.REJECTED }),
    );
    await expect(approver.execute('a1')).rejects.toThrow(BadRequestException);
  });

  it('creates the proposed marca when no marca matches its name', async () => {
    finder.byId.mockResolvedValue(freeProposal());
    marcaFinder.byNombre.mockResolvedValue(null);
    marcaCreator.execute.mockResolvedValue({ id: 'm9' } as Marca);

    const result = await approver.execute('a1');

    expect(marcaCreator.execute).toHaveBeenCalledWith({ nombre: 'Dona Pepa' });
    expect(result.marcaId).toBe('m9');
    expect(result.marcaNombrePropuesto).toBeNull();
    expect(result.status).toBe(AlfajorStatus.APPROVED);
  });

  it('reuses an existing marca whose name matches exactly', async () => {
    finder.byId.mockResolvedValue(freeProposal());
    marcaFinder.byNombre.mockResolvedValue({ id: 'm5' } as Marca);

    const result = await approver.execute('a1');

    expect(marcaCreator.execute).not.toHaveBeenCalled();
    expect(result.marcaId).toBe('m5');
    expect(result.marcaNombrePropuesto).toBeNull();
  });

  it('maps the proposal to the marca chosen by the admin', async () => {
    finder.byId.mockResolvedValue(freeProposal());
    marcaFinder.byId.mockResolvedValue({ id: 'm7' } as Marca);

    const result = await approver.execute('a1', { marcaId: 'm7' });

    expect(marcaFinder.byId).toHaveBeenCalledWith('m7');
    expect(marcaFinder.byNombre).not.toHaveBeenCalled();
    expect(marcaCreator.execute).not.toHaveBeenCalled();
    expect(result.marcaId).toBe('m7');
    expect(result.marcaNombrePropuesto).toBeNull();
  });

  it('propagates NotFound when the marcaId from the body does not exist', async () => {
    finder.byId.mockResolvedValue(freeProposal());
    marcaFinder.byId.mockRejectedValue(new NotFoundException());

    await expect(approver.execute('a1', { marcaId: 'nope' })).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('propagates Conflict when the resolved marca already has that alfajor', async () => {
    finder.byId.mockResolvedValue(freeProposal());
    marcaFinder.byNombre.mockResolvedValue({ id: 'm5' } as Marca);
    duplicateChecker.assertUnique.mockRejectedValue(new ConflictException());

    await expect(approver.execute('a1')).rejects.toThrow(ConflictException);
    expect(duplicateChecker.assertUnique).toHaveBeenCalledWith('X', 'm5', 'a1');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws BadRequest when there is no marca and nothing to resolve it with', async () => {
    finder.byId.mockResolvedValue(
      baseAlfajor({ marcaId: null, marcaNombrePropuesto: null }),
    );

    await expect(approver.execute('a1')).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns the alfajor re-read after saving, with the marca relation fresh', async () => {
    const saved = baseAlfajor({
      marcaId: 'm9',
      status: AlfajorStatus.APPROVED,
      marca: { id: 'm9', nombre: 'Dona Pepa' } as Marca,
    });
    finder.byId
      .mockResolvedValueOnce(freeProposal())
      .mockResolvedValueOnce(saved);
    marcaFinder.byNombre.mockResolvedValue(null);
    marcaCreator.execute.mockResolvedValue({ id: 'm9' } as Marca);

    const result = await approver.execute('a1');

    expect(finder.byId).toHaveBeenCalledTimes(2);
    expect(result).toBe(saved);
    expect(result.marca?.id).toBe('m9');
  });

  it('ignores the body marcaId when the alfajor already has a marca', async () => {
    finder.byId.mockResolvedValue(baseAlfajor());

    const result = await approver.execute('a1', { marcaId: 'm7' });

    expect(marcaFinder.byId).not.toHaveBeenCalled();
    expect(result.marcaId).toBe('m1');
  });
});
