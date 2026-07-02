import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marca } from '../domain/marca.entity';
import { MarcaSearcher } from './marca-searcher';

describe('MarcaSearcher', () => {
  let searcher: MarcaSearcher;
  let repo: jest.Mocked<Repository<Marca>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MarcaSearcher,
        {
          provide: getRepositoryToken(Marca),
          useValue: { findAndCount: jest.fn() },
        },
      ],
    }).compile();

    searcher = module.get(MarcaSearcher);
    repo = module.get(getRepositoryToken(Marca));
  });

  it('paginates and returns items, total', async () => {
    const items = [{ id: 'm1' } as Marca];
    repo.findAndCount.mockResolvedValue([items, 1]);

    const res = await searcher.execute({ page: 2, limit: 10 });

    expect(res).toEqual({ items, total: 1, page: 2, limit: 10 });
    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: {},
      order: { nombre: 'ASC' },
      skip: 10,
      take: 10,
    });
  });

  it('applies an unaccent-aware ILIKE filter when q is provided', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    await searcher.execute({ q: 'havan', page: 1, limit: 20 });

    const { where } = repo.findAndCount.mock.calls[0][0] as {
      where: {
        nombre: {
          type: string;
          objectLiteralParameters: Record<string, unknown>;
          getSql(alias: string): string;
        };
      };
    };
    expect(where.nombre.type).toBe('raw');
    expect(where.nombre.objectLiteralParameters).toEqual({ q: '%havan%' });
    expect(where.nombre.getSql('nombre')).toBe(
      'unaccent(nombre) ILIKE unaccent(:q)',
    );
  });
});
