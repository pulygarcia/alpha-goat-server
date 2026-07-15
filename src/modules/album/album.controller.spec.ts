import { Test } from '@nestjs/testing';
import { AlfajorTipo } from '../alfajores/domain/alfajor-tipo.enum';
import { AlbumController } from './album.controller';
import { Album, AlbumFinder } from './services/album-finder';

describe('AlbumController', () => {
  let controller: AlbumController;
  let finder: { execute: jest.Mock };

  const album: Album = {
    owner: {
      id: 'user-1',
      username: 'puly',
      avatarUrl: 'http://img/avatar.png',
    } as Album['owner'],
    stats: { collected: 1, total: 2, pct: 50 },
    hojas: [
      {
        marca: {
          id: 'm1',
          nombre: 'Havanna',
          logoUrl: null,
          provincia: 'Buenos Aires',
        } as Album['hojas'][number]['marca'],
        stats: { collected: 1, total: 2, pct: 50 },
        alfajores: [
          {
            id: 'a1',
            nombre: '70% cacao',
            tipo: AlfajorTipo.CHOCOLATE,
            imagenUrl: null,
            avgRating: 4.5,
            collected: true,
            myRating: 4,
            reviewId: 'rev-1',
          },
          {
            id: 'a2',
            nombre: 'Blanco',
            tipo: AlfajorTipo.BLANCO,
            imagenUrl: null,
            avgRating: null,
            collected: false,
            myRating: null,
            reviewId: null,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    finder = { execute: jest.fn().mockResolvedValue(album) };
    const module = await Test.createTestingModule({
      controllers: [AlbumController],
      providers: [{ provide: AlbumFinder, useValue: finder }],
    }).compile();
    controller = module.get(AlbumController);
  });

  it('should forward the username to the finder and map to the response dto', async () => {
    const response = await controller.byUsername('puly');

    expect(finder.execute).toHaveBeenCalledWith('puly');
    expect(response.owner).toEqual({
      id: 'user-1',
      username: 'puly',
      avatarUrl: 'http://img/avatar.png',
    });
    expect(response.stats).toEqual({ collected: 1, total: 2, pct: 50 });
    expect(response.hojas).toHaveLength(1);
    expect(response.hojas[0].marca).toEqual({
      id: 'm1',
      nombre: 'Havanna',
      logoUrl: null,
      provincia: 'Buenos Aires',
    });
    expect(response.hojas[0].alfajores[0]).toMatchObject({
      id: 'a1',
      avgRating: 4.5,
      collected: true,
      myRating: 4,
      reviewId: 'rev-1',
    });
    expect(response.hojas[0].alfajores[1]).toMatchObject({
      collected: false,
      myRating: null,
      reviewId: null,
    });
  });
});
