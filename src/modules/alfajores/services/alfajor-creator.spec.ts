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

describe('AlfajorCreator', () => {
  let creator: AlfajorCreator;
  let repo: jest.Mocked<Repository<Alfajor>>;
  let marcaFinder: jest.Mocked<MarcaFinder>;

  const dto = {
    nombre: 'Jorgito',
    marcaId: 'm1',
    tipo: AlfajorTipo.CHOCOLATE,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorCreator,
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        { provide: MarcaFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    creator = module.get(AlfajorCreator);
    repo = module.get(getRepositoryToken(Alfajor));
    marcaFinder = module.get(MarcaFinder);
  });

  it('creates a PENDING alfajor with createdById', async () => {
    marcaFinder.byId.mockResolvedValue({ id: 'm1' } as Marca);
    repo.findOne.mockResolvedValue(null);
    const created = { id: 'a1', status: AlfajorStatus.PENDING } as Alfajor;
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue(created);

    const result = await creator.execute(dto, 'u1');

    expect(result.status).toBe(AlfajorStatus.PENDING);
    expect(repo.create).toHaveBeenCalledWith({
      ...dto,
      status: AlfajorStatus.PENDING,
      createdById: 'u1',
    });
  });

  it('propagates NotFoundException when marca does not exist', async () => {
    marcaFinder.byId.mockRejectedValue(new NotFoundException());
    await expect(creator.execute(dto, 'u1')).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException on duplicate (nombre, marcaId)', async () => {
    marcaFinder.byId.mockResolvedValue({ id: 'm1' } as Marca);
    repo.findOne.mockResolvedValue({ id: 'existing' } as Alfajor);

    await expect(creator.execute(dto, 'u1')).rejects.toThrow(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
