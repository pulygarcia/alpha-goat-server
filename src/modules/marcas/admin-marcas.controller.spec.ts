import { Test } from '@nestjs/testing';
import { AdminMarcasController } from './admin-marcas.controller';
import { Marca } from './domain/marca.entity';
import { MarcaCreator } from './services/marca-creator';
import { MarcaUpdater } from './services/marca-updater';

describe('AdminMarcasController', () => {
  let controller: AdminMarcasController;
  let creator: jest.Mocked<MarcaCreator>;
  let updater: jest.Mocked<MarcaUpdater>;

  const marca = {
    id: 'm1',
    nombre: 'Havanna',
    provincia: null,
    descripcion: null,
    logoUrl: null,
    createdAt: new Date(),
  } as Marca;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminMarcasController],
      providers: [
        { provide: MarcaCreator, useValue: { execute: jest.fn() } },
        { provide: MarcaUpdater, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AdminMarcasController);
    creator = module.get(MarcaCreator);
    updater = module.get(MarcaUpdater);
  });

  it('create returns response dto', async () => {
    creator.execute.mockResolvedValue(marca);
    const res = await controller.create({ nombre: 'Havanna' });
    expect(res.id).toBe('m1');
  });

  it('update forwards to updater', async () => {
    updater.execute.mockResolvedValue({ ...marca, nombre: 'New' });
    const res = await controller.update('m1', { nombre: 'New' });
    expect(updater.execute).toHaveBeenCalledWith('m1', { nombre: 'New' });
    expect(res.nombre).toBe('New');
  });
});
