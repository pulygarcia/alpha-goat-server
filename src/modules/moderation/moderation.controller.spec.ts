import { Test } from '@nestjs/testing';
import { Alfajor } from '../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../alfajores/domain/alfajor-status.enum';
import { AlfajorTipo } from '../alfajores/domain/alfajor-tipo.enum';
import { AlfajorSearcher } from '../alfajores/services/alfajor-searcher';
import { ModerationController } from './moderation.controller';
import { AlfajorApprover } from './services/alfajor-approver';
import { AlfajorRejecter } from './services/alfajor-rejecter';

describe('ModerationController', () => {
  let controller: ModerationController;
  let searcher: jest.Mocked<AlfajorSearcher>;
  let approver: jest.Mocked<AlfajorApprover>;
  let rejecter: jest.Mocked<AlfajorRejecter>;

  const alfajor = {
    id: 'a1',
    nombre: 'Jorgito',
    marcaId: null,
    marcaNombrePropuesto: 'Dona Pepa',
    tipo: AlfajorTipo.CHOCOLATE,
    descripcion: null,
    imagenUrl: null,
    status: AlfajorStatus.PENDING,
    rejectionReason: null,
    createdById: 'u1',
    createdAt: new Date(),
  } as Alfajor;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [
        { provide: AlfajorSearcher, useValue: { execute: jest.fn() } },
        { provide: AlfajorApprover, useValue: { execute: jest.fn() } },
        { provide: AlfajorRejecter, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(ModerationController);
    searcher = module.get(AlfajorSearcher);
    approver = module.get(AlfajorApprover);
    rejecter = module.get(AlfajorRejecter);
  });

  it('lists pending alfajores including the proposed marca name', async () => {
    searcher.execute.mockResolvedValue({
      items: [alfajor],
      total: 1,
      page: 1,
      limit: 20,
      avgRatingById: new Map(),
    });

    const res = await controller.listPending({ page: 1, limit: 20 });

    expect(searcher.execute).toHaveBeenCalledWith(
      { page: 1, limit: 20, status: AlfajorStatus.PENDING },
      { includeAllStatuses: true },
    );
    expect(res.items[0].marcaId).toBeNull();
    expect(res.items[0].marcaNombrePropuesto).toBe('Dona Pepa');
  });

  it('forwards the optional marcaId to the approver', async () => {
    approver.execute.mockResolvedValue({
      ...alfajor,
      marcaId: 'm7',
      marcaNombrePropuesto: null,
      status: AlfajorStatus.APPROVED,
    });

    const res = await controller.approve('a1', { marcaId: 'm7' });

    expect(approver.execute).toHaveBeenCalledWith('a1', { marcaId: 'm7' });
    expect(res.marcaId).toBe('m7');
    expect(res.marcaNombrePropuesto).toBeNull();
  });

  it('approves with an empty body when there is nothing to resolve', async () => {
    approver.execute.mockResolvedValue({
      ...alfajor,
      marcaId: 'm9',
      marcaNombrePropuesto: null,
      status: AlfajorStatus.APPROVED,
    });

    await controller.approve('a1', {});

    expect(approver.execute).toHaveBeenCalledWith('a1', {});
  });

  it('forwards the rejection reason', async () => {
    rejecter.execute.mockResolvedValue({
      ...alfajor,
      status: AlfajorStatus.REJECTED,
      rejectionReason: 'no existe',
    });

    const res = await controller.reject('a1', { rejectionReason: 'no existe' });

    expect(rejecter.execute).toHaveBeenCalledWith('a1', {
      rejectionReason: 'no existe',
    });
    expect(res.rejectionReason).toBe('no existe');
  });
});
