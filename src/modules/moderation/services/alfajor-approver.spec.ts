import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';
import { AlfajorFinder } from '../../alfajores/services/alfajor-finder';
import { AlfajorApprover } from './alfajor-approver';

describe('AlfajorApprover', () => {
  let approver: AlfajorApprover;
  let repo: jest.Mocked<Repository<Alfajor>>;
  let finder: jest.Mocked<AlfajorFinder>;

  const baseAlfajor = (overrides: Partial<Alfajor> = {}): Alfajor =>
    ({
      id: 'a1',
      nombre: 'X',
      marcaId: 'm1',
      tipo: AlfajorTipo.CHOCOLATE,
      status: AlfajorStatus.PENDING,
      rejectionReason: null,
      ...overrides,
    } as Alfajor);

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorApprover,
        { provide: getRepositoryToken(Alfajor), useValue: { save: jest.fn() } },
        { provide: AlfajorFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    approver = module.get(AlfajorApprover);
    repo = module.get(getRepositoryToken(Alfajor));
    finder = module.get(AlfajorFinder);
  });

  it('approves a PENDING alfajor and clears rejectionReason', async () => {
    finder.byId.mockResolvedValue(baseAlfajor({ rejectionReason: 'stale' }));
    repo.save.mockImplementation(async (a) => a as Alfajor);

    const result = await approver.execute('a1');

    expect(result.status).toBe(AlfajorStatus.APPROVED);
    expect(result.rejectionReason).toBeNull();
  });

  it('throws BadRequest when alfajor is already APPROVED', async () => {
    finder.byId.mockResolvedValue(baseAlfajor({ status: AlfajorStatus.APPROVED }));
    await expect(approver.execute('a1')).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws BadRequest when alfajor is REJECTED', async () => {
    finder.byId.mockResolvedValue(baseAlfajor({ status: AlfajorStatus.REJECTED }));
    await expect(approver.execute('a1')).rejects.toThrow(BadRequestException);
  });
});
