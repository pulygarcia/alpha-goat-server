import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';
import { AlfajorSearcher } from './alfajor-searcher';

describe('AlfajorSearcher', () => {
  let searcher: AlfajorSearcher;
  let repo: jest.Mocked<Repository<Alfajor>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorSearcher,
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { findAndCount: jest.fn() },
        },
      ],
    }).compile();

    searcher = module.get(AlfajorSearcher);
    repo = module.get(getRepositoryToken(Alfajor));
  });

  it('forces status APPROVED for non-admin and applies q + filters', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    await searcher.execute({
      q: 'jorg',
      marcaId: 'm1',
      tipo: AlfajorTipo.CHOCOLATE,
      page: 2,
      limit: 10,
    });

    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: {
        nombre: ILike('%jorg%'),
        marcaId: 'm1',
        tipo: AlfajorTipo.CHOCOLATE,
        status: AlfajorStatus.APPROVED,
      },
      relations: { marca: true },
      order: { nombre: 'ASC' },
      skip: 10,
      take: 10,
    });
  });

  it('respects status filter when includeAllStatuses', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    await searcher.execute(
      { status: AlfajorStatus.PENDING, page: 1, limit: 20 },
      { includeAllStatuses: true },
    );

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: AlfajorStatus.PENDING } }),
    );
  });

  it('omits status when includeAllStatuses and no status given', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    await searcher.execute(
      { page: 1, limit: 20 },
      { includeAllStatuses: true },
    );

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('returns paginated result', async () => {
    const items = [{ id: 'a1' } as Alfajor];
    repo.findAndCount.mockResolvedValue([items, 1]);

    const res = await searcher.execute({ page: 1, limit: 20 });

    expect(res).toEqual({ items, total: 1, page: 1, limit: 20 });
  });
});
