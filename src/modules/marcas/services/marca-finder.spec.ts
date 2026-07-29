import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marca } from '../domain/marca.entity';
import { MarcaFinder } from './marca-finder';

describe('MarcaFinder', () => {
  let finder: MarcaFinder;
  let repo: jest.Mocked<Repository<Marca>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MarcaFinder,
        {
          provide: getRepositoryToken(Marca),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    finder = module.get(MarcaFinder);
    repo = module.get(getRepositoryToken(Marca));
  });

  it('returns marca when found', async () => {
    const marca = { id: 'm1' } as Marca;
    repo.findOne.mockResolvedValue(marca);
    await expect(finder.byId('m1')).resolves.toBe(marca);
  });

  it('throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(finder.byId('missing')).rejects.toThrow(NotFoundException);
  });

  it('finds a marca by exact nombre', async () => {
    const marca = { id: 'm1' } as Marca;
    repo.findOne.mockResolvedValue(marca);

    await expect(finder.byNombre('Havanna')).resolves.toBe(marca);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { nombre: 'Havanna' },
    });
  });

  it('returns null instead of throwing when no marca has that nombre', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(finder.byNombre('Doña Pepa')).resolves.toBeNull();
  });
});
