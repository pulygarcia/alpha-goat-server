import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marca } from '../domain/marca.entity';
import { MarcaCreator } from './marca-creator';

describe('MarcaCreator', () => {
  let creator: MarcaCreator;
  let repo: jest.Mocked<Repository<Marca>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MarcaCreator,
        {
          provide: getRepositoryToken(Marca),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();

    creator = module.get(MarcaCreator);
    repo = module.get(getRepositoryToken(Marca));
  });

  it('creates marca when nombre is free', async () => {
    repo.findOne.mockResolvedValue(null);
    const created = { id: 'm1', nombre: 'Havanna' } as Marca;
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue(created);

    const result = await creator.execute({ nombre: 'Havanna' });

    expect(result).toBe(created);
    expect(repo.create).toHaveBeenCalledWith({ nombre: 'Havanna' });
  });

  it('throws ConflictException when nombre is taken', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing' } as Marca);

    await expect(creator.execute({ nombre: 'Havanna' })).rejects.toThrow(
      ConflictException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});
