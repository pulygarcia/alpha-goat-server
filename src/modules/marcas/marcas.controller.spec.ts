import { Test } from '@nestjs/testing';
import { Marca } from './domain/marca.entity';
import { MarcasController } from './marcas.controller';
import { MarcaFinder } from './services/marca-finder';
import { MarcaSearcher } from './services/marca-searcher';

describe('MarcasController', () => {
  let controller: MarcasController;
  let finder: jest.Mocked<MarcaFinder>;
  let searcher: jest.Mocked<MarcaSearcher>;

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
      controllers: [MarcasController],
      providers: [
        { provide: MarcaFinder, useValue: { byId: jest.fn() } },
        { provide: MarcaSearcher, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(MarcasController);
    finder = module.get(MarcaFinder);
    searcher = module.get(MarcaSearcher);
  });

  it('search returns paginated response dtos', async () => {
    searcher.execute.mockResolvedValue({ items: [marca], total: 1, page: 1, limit: 20 });

    const res = await controller.search({ page: 1, limit: 20 });

    expect(res.total).toBe(1);
    expect(res.items[0].nombre).toBe('Havanna');
  });

  it('findOne returns response dto', async () => {
    finder.byId.mockResolvedValue(marca);
    const res = await controller.findOne('m1');
    expect(res.id).toBe('m1');
  });
});
