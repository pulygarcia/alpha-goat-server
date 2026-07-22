import { Test } from '@nestjs/testing';
import { UserRole } from '../users/domain/user-role.enum';
import { User } from '../users/domain/user.entity';
import { AlfajoresController } from './alfajores.controller';
import { Alfajor } from './domain/alfajor.entity';
import { AlfajorStatus } from './domain/alfajor-status.enum';
import { AlfajorTipo } from './domain/alfajor-tipo.enum';
import { AlfajorCreator } from './services/alfajor-creator';
import { AlfajorFinder } from './services/alfajor-finder';
import { AlfajorImageUpdater } from './services/alfajor-image-updater';
import { AlfajorSearcher } from './services/alfajor-searcher';
import { AlfajorUpdater } from './services/alfajor-updater';

describe('AlfajoresController', () => {
  let controller: AlfajoresController;
  let creator: jest.Mocked<AlfajorCreator>;
  let finder: jest.Mocked<AlfajorFinder>;
  let searcher: jest.Mocked<AlfajorSearcher>;
  let updater: jest.Mocked<AlfajorUpdater>;
  let imageUpdater: jest.Mocked<AlfajorImageUpdater>;

  const alfajor = {
    id: 'a1',
    nombre: 'Jorgito',
    marcaId: 'm1',
    tipo: AlfajorTipo.CHOCOLATE,
    descripcion: null,
    imagenUrl: null,
    status: AlfajorStatus.PENDING,
    rejectionReason: null,
    createdById: 'u1',
    createdAt: new Date(),
  } as Alfajor;

  const userActor = { id: 'u1', role: UserRole.USER } as User;
  const adminActor = { id: 'admin', role: UserRole.ADMIN } as User;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AlfajoresController],
      providers: [
        { provide: AlfajorCreator, useValue: { execute: jest.fn() } },
        {
          provide: AlfajorFinder,
          useValue: { byId: jest.fn(), byIdWithAvgRating: jest.fn() },
        },
        { provide: AlfajorSearcher, useValue: { execute: jest.fn() } },
        { provide: AlfajorUpdater, useValue: { execute: jest.fn() } },
        { provide: AlfajorImageUpdater, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AlfajoresController);
    creator = module.get(AlfajorCreator);
    finder = module.get(AlfajorFinder);
    searcher = module.get(AlfajorSearcher);
    updater = module.get(AlfajorUpdater);
    imageUpdater = module.get(AlfajorImageUpdater);
  });

  it('search calls searcher without admin flag for anonymous', async () => {
    searcher.execute.mockResolvedValue({
      items: [alfajor],
      total: 1,
      page: 1,
      limit: 20,
    });

    const res = await controller.search({ page: 1, limit: 20 });

    expect(searcher.execute).toHaveBeenCalledWith(
      { page: 1, limit: 20 },
      { includeAllStatuses: false },
    );
    expect(res.items[0].id).toBe('a1');
  });

  it('search passes includeAllStatuses for admin', async () => {
    searcher.execute.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await controller.search({ page: 1, limit: 20 }, adminActor);

    expect(searcher.execute).toHaveBeenCalledWith(
      { page: 1, limit: 20 },
      { includeAllStatuses: true },
    );
  });

  it('findOne returns response dto with avgRating', async () => {
    finder.byIdWithAvgRating.mockResolvedValue({
      alfajor,
      avgRating: 4.33,
    });
    const res = await controller.findOne('a1');
    expect(res.id).toBe('a1');
    expect(res.avgRating).toBe(4.33);
    expect(finder.byIdWithAvgRating).toHaveBeenCalledWith('a1');
  });

  it('create forwards dto and userId', async () => {
    creator.execute.mockResolvedValue(alfajor);
    const res = await controller.create(
      { nombre: 'Jorgito', marcaId: 'm1', tipo: AlfajorTipo.CHOCOLATE },
      userActor,
    );
    expect(creator.execute).toHaveBeenCalledWith(
      { nombre: 'Jorgito', marcaId: 'm1', tipo: AlfajorTipo.CHOCOLATE },
      'u1',
    );
    expect(res.nombre).toBe('Jorgito');
  });

  it('update forwards actor context', async () => {
    updater.execute.mockResolvedValue({ ...alfajor, nombre: 'New' });

    await controller.update('a1', { nombre: 'New' }, userActor);

    expect(updater.execute).toHaveBeenCalledWith(
      'a1',
      { nombre: 'New' },
      { id: 'u1', role: UserRole.USER },
    );
  });

  it('uploadImage forwards buffer and actor context', async () => {
    imageUpdater.execute.mockResolvedValue({
      ...alfajor,
      imagenUrl: 'https://cdn/alfajores/a1.png',
    });
    const file = { buffer: Buffer.from('img') } as Express.Multer.File;

    const res = await controller.uploadImage('a1', file, userActor);

    expect(imageUpdater.execute).toHaveBeenCalledWith('a1', file.buffer, {
      id: 'u1',
      role: UserRole.USER,
    });
    expect(res.imagenUrl).toBe('https://cdn/alfajores/a1.png');
  });
});
