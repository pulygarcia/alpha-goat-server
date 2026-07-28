import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorDuplicateChecker } from './alfajor-duplicate-checker';

describe('AlfajorDuplicateChecker', () => {
  let checker: AlfajorDuplicateChecker;
  let repo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AlfajorDuplicateChecker,
        { provide: getRepositoryToken(Alfajor), useValue: repo },
      ],
    }).compile();

    checker = module.get(AlfajorDuplicateChecker);
  });

  it('passes when no alfajor has that nombre for that marca', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(checker.assertUnique('Jorgito', 'm1')).resolves.toBeUndefined();
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { nombre: 'Jorgito', marcaId: 'm1' },
    });
  });

  it('throws ConflictException when the pair already exists', async () => {
    repo.findOne.mockResolvedValue({ id: 'a1' });

    await expect(checker.assertUnique('Jorgito', 'm1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('ignores the alfajor being approved when an id is excluded', async () => {
    repo.findOne.mockResolvedValue(null);

    await checker.assertUnique('Jorgito', 'm1', 'a1');

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { nombre: 'Jorgito', marcaId: 'm1', id: Not('a1') },
    });
  });
});
