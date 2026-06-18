import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { AlfajorTipo } from '../domain/alfajor-tipo.enum';
import { AlfajorSearcher } from './alfajor-searcher';

const makeQb = (items: unknown[], total: number) => {
  const qb: any = {};
  for (const m of [
    'leftJoinAndSelect',
    'andWhere',
    'orderBy',
    'skip',
    'take',
  ]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([items, total]);
  return qb;
};

describe('AlfajorSearcher', () => {
  let searcher: AlfajorSearcher;
  let repo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    repo = { createQueryBuilder: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AlfajorSearcher,
        { provide: getRepositoryToken(Alfajor), useValue: repo },
      ],
    }).compile();

    searcher = module.get(AlfajorSearcher);
  });

  it('filters by unaccented name, status APPROVED, marca and tipo (non-admin)', async () => {
    const qb = makeQb([], 0);
    repo.createQueryBuilder.mockReturnValue(qb);

    await searcher.execute({
      q: 'jorg',
      marcaId: 'm1',
      tipo: AlfajorTipo.CHOCOLATE,
      page: 2,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'unaccent(a.nombre) ILIKE unaccent(:q)',
      { q: '%jorg%' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('a.marcaId = :marcaId', {
      marcaId: 'm1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('a.tipo = :tipo', {
      tipo: AlfajorTipo.CHOCOLATE,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('a.status = :status', {
      status: AlfajorStatus.APPROVED,
    });
    expect(qb.skip).toHaveBeenCalledWith(10); // (2-1)*10
    expect(qb.take).toHaveBeenCalledWith(10);
  });

  it('respects the status filter when includeAllStatuses', async () => {
    const qb = makeQb([], 0);
    repo.createQueryBuilder.mockReturnValue(qb);

    await searcher.execute(
      { status: AlfajorStatus.PENDING, page: 1, limit: 20 },
      { includeAllStatuses: true },
    );

    expect(qb.andWhere).toHaveBeenCalledWith('a.status = :status', {
      status: AlfajorStatus.PENDING,
    });
  });

  it('omits the status filter when includeAllStatuses and no status given', async () => {
    const qb = makeQb([], 0);
    repo.createQueryBuilder.mockReturnValue(qb);

    await searcher.execute(
      { page: 1, limit: 20 },
      { includeAllStatuses: true },
    );

    const statusCall = qb.andWhere.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('status'),
    );
    expect(statusCall).toBeUndefined();
  });

  it('returns the paginated result', async () => {
    const items = [{ id: 'a1' } as Alfajor];
    const qb = makeQb(items, 1);
    repo.createQueryBuilder.mockReturnValue(qb);

    const res = await searcher.execute({ page: 1, limit: 20 });

    expect(res).toEqual({ items, total: 1, page: 1, limit: 20 });
  });
});
