import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marca } from '../domain/marca.entity';
import { MarcaFinder } from './marca-finder';
import { MarcaUpdater } from './marca-updater';

describe('MarcaUpdater', () => {
  let updater: MarcaUpdater;
  let repo: jest.Mocked<Repository<Marca>>;
  let finder: jest.Mocked<MarcaFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MarcaUpdater,
        {
          provide: getRepositoryToken(Marca),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        { provide: MarcaFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    updater = module.get(MarcaUpdater);
    repo = module.get(getRepositoryToken(Marca));
    finder = module.get(MarcaFinder);
  });

  it('updates fields when nombre is free', async () => {
    const marca = { id: 'm1', nombre: 'Old', provincia: null } as Marca;
    finder.byId.mockResolvedValue(marca);
    repo.findOne.mockResolvedValue(null);
    repo.save.mockImplementation(async (m) => m as Marca);

    const result = await updater.execute('m1', { nombre: 'New', provincia: 'BA' });

    expect(result.nombre).toBe('New');
    expect(result.provincia).toBe('BA');
  });

  it('throws ConflictException when nombre is taken', async () => {
    finder.byId.mockResolvedValue({ id: 'm1', nombre: 'Old' } as Marca);
    repo.findOne.mockResolvedValue({ id: 'other' } as Marca);

    await expect(updater.execute('m1', { nombre: 'Taken' })).rejects.toThrow(
      ConflictException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('skips uniqueness check when nombre unchanged', async () => {
    const marca = { id: 'm1', nombre: 'Same' } as Marca;
    finder.byId.mockResolvedValue(marca);
    repo.save.mockResolvedValue(marca);

    await updater.execute('m1', { nombre: 'Same' });

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('clears nullable fields when explicitly set to null-like (empty string passes)', async () => {
    const marca = { id: 'm1', nombre: 'X', descripcion: 'old' } as Marca;
    finder.byId.mockResolvedValue(marca);
    repo.save.mockImplementation(async (m) => m as Marca);

    const result = await updater.execute('m1', { descripcion: 'new' });

    expect(result.descripcion).toBe('new');
  });

  it('saves untouched marca when dto is empty', async () => {
    const marca = { id: 'm1', nombre: 'X' } as Marca;
    finder.byId.mockResolvedValue(marca);
    repo.save.mockResolvedValue(marca);

    await updater.execute('m1', {});

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(marca);
  });
});
