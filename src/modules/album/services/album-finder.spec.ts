import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';
import { Marca } from '../../marcas/domain/marca.entity';
import { Review } from '../../reviews/domain/review.entity';
import { UserFinder } from '../../users/services/user-finder';
import { AlbumFinder } from './album-finder';

describe('AlbumFinder', () => {
  const owner = { id: 'user-1', username: 'puly', avatarUrl: null };

  const catalogRow = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'alf-1',
    nombre: 'Clásico',
    tipo: AlfajorTipo.CHOCOLATE,
    imagenUrl: null,
    marcaId: 'marca-1',
    avgrating: null,
    ...over,
  });

  const marca = (id: string, nombre: string) => ({
    id,
    nombre,
    logoUrl: null,
    provincia: null,
  });

  let finder: AlbumFinder;
  let userFinder: { byUsernameOrFail: jest.Mock };
  let qb: { getRawMany: jest.Mock };
  let reviewsFind: jest.Mock;
  let marcasFind: jest.Mock;

  const setup = async () => {
    qb = { getRawMany: jest.fn().mockResolvedValue([]) };
    const qbChain = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: (...args: unknown[]) => qb.getRawMany(...args),
    };
    userFinder = { byUsernameOrFail: jest.fn().mockResolvedValue(owner) };
    reviewsFind = jest.fn().mockResolvedValue([]);
    marcasFind = jest.fn().mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        AlbumFinder,
        { provide: UserFinder, useValue: userFinder },
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qbChain) },
        },
        {
          provide: getRepositoryToken(Review),
          useValue: { find: reviewsFind },
        },
        {
          provide: getRepositoryToken(Marca),
          useValue: { find: marcasFind },
        },
      ],
    }).compile();

    finder = module.get(AlbumFinder);
    return qbChain;
  };

  beforeEach(async () => {
    await setup();
  });

  it('should propagate NotFoundException when the username does not exist', async () => {
    userFinder.byUsernameOrFail.mockRejectedValue(new NotFoundException());
    await expect(finder.execute('ghost')).rejects.toThrow(NotFoundException);
  });

  it('should return an empty album with zeroed stats when there are no approved alfajores', async () => {
    const album = await finder.execute('puly');
    expect(album.owner).toEqual(owner);
    expect(album.hojas).toEqual([]);
    expect(album.stats).toEqual({ collected: 0, total: 0, pct: 0 });
    expect(reviewsFind).not.toHaveBeenCalled();
  });

  it('should only query approved alfajores', async () => {
    const qbChain = await setup();
    await finder.execute('puly');
    expect(qbChain.where).toHaveBeenCalledWith('a.status = :status', {
      status: AlfajorStatus.APPROVED,
    });
  });

  it('should order hojas alphabetically by marca nombre', async () => {
    qb.getRawMany.mockResolvedValue([
      catalogRow({ id: 'a1', marcaId: 'm-hav' }),
      catalogRow({ id: 'a2', marcaId: 'm-cach' }),
    ]);
    marcasFind.mockResolvedValue([
      marca('m-hav', 'Havanna'),
      marca('m-cach', 'Cachafaz'),
    ]);

    const album = await finder.execute('puly');
    expect(album.hojas.map((h) => h.marca.nombre)).toEqual([
      'Cachafaz',
      'Havanna',
    ]);
  });

  it('should order stickers by avgRating desc with review-less ones last', async () => {
    qb.getRawMany.mockResolvedValue([
      catalogRow({ id: 'a1', nombre: 'Sin reviews', avgrating: null }),
      catalogRow({ id: 'a2', nombre: 'Mediocre', avgrating: '2.0000' }),
      catalogRow({ id: 'a3', nombre: 'Crack', avgrating: '4.5000' }),
    ]);
    marcasFind.mockResolvedValue([marca('marca-1', 'Havanna')]);

    const album = await finder.execute('puly');
    const stickers = album.hojas[0].alfajores;
    expect(stickers.map((s) => s.nombre)).toEqual([
      'Crack',
      'Mediocre',
      'Sin reviews',
    ]);
    expect(stickers[0].avgRating).toBe(4.5);
    expect(stickers[2].avgRating).toBeNull();
  });

  it('should break avgRating ties by nombre ascending', async () => {
    qb.getRawMany.mockResolvedValue([
      catalogRow({ id: 'a1', nombre: 'Zeta', avgrating: '4.0000' }),
      catalogRow({ id: 'a2', nombre: 'Alfa', avgrating: '4.0000' }),
    ]);
    marcasFind.mockResolvedValue([marca('marca-1', 'Havanna')]);

    const album = await finder.execute('puly');
    expect(album.hojas[0].alfajores.map((s) => s.nombre)).toEqual([
      'Alfa',
      'Zeta',
    ]);
  });

  it('should mark stickers collected from the owner reviews with myRating and reviewId', async () => {
    qb.getRawMany.mockResolvedValue([
      catalogRow({ id: 'a1', nombre: 'Probado', avgrating: '4.0000' }),
      catalogRow({ id: 'a2', nombre: 'Pendiente', avgrating: '3.0000' }),
    ]);
    marcasFind.mockResolvedValue([marca('marca-1', 'Havanna')]);
    reviewsFind.mockResolvedValue([
      { id: 'rev-1', alfajorId: 'a1', ratingGeneral: 4 },
    ]);

    const album = await finder.execute('puly');
    const [probado, pendiente] = album.hojas[0].alfajores;
    expect(probado).toMatchObject({
      collected: true,
      myRating: 4,
      reviewId: 'rev-1',
    });
    expect(pendiente).toMatchObject({
      collected: false,
      myRating: null,
      reviewId: null,
    });
    expect(reviewsFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: owner.id } }),
    );
  });

  it('should compute per-hoja and global stats with pct rounded to 2 decimals', async () => {
    qb.getRawMany.mockResolvedValue([
      catalogRow({ id: 'a1', marcaId: 'm1', avgrating: '4.0000' }),
      catalogRow({ id: 'a2', marcaId: 'm1', avgrating: '3.0000' }),
      catalogRow({ id: 'a3', marcaId: 'm2', avgrating: '2.0000' }),
    ]);
    marcasFind.mockResolvedValue([
      marca('m1', 'Cachafaz'),
      marca('m2', 'Havanna'),
    ]);
    reviewsFind.mockResolvedValue([
      { id: 'rev-1', alfajorId: 'a1', ratingGeneral: 5 },
    ]);

    const album = await finder.execute('puly');
    expect(album.stats).toEqual({ collected: 1, total: 3, pct: 33.33 });
    expect(album.hojas[0].stats).toEqual({ collected: 1, total: 2, pct: 50 });
    expect(album.hojas[1].stats).toEqual({ collected: 0, total: 1, pct: 0 });
  });

  it('should round avgRating to 2 decimals', async () => {
    qb.getRawMany.mockResolvedValue([
      catalogRow({ id: 'a1', avgrating: '4.3333333333' }),
    ]);
    marcasFind.mockResolvedValue([marca('marca-1', 'Havanna')]);

    const album = await finder.execute('puly');
    expect(album.hojas[0].alfajores[0].avgRating).toBe(4.33);
  });

  it('should drop rows whose marca could not be hydrated', async () => {
    qb.getRawMany.mockResolvedValue([
      catalogRow({ id: 'a1', marcaId: 'm-desconocida' }),
    ]);
    marcasFind.mockResolvedValue([]);

    const album = await finder.execute('puly');
    expect(album.hojas).toEqual([]);
  });
});
