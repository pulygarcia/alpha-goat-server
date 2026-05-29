import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';
import { AlfajorFinder } from '../../alfajores/services/alfajor-finder';
import { AlfajorRejecter } from './alfajor-rejecter';

describe('AlfajorRejecter', () => {
  let rejecter: AlfajorRejecter;
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
    }) as Alfajor;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorRejecter,
        { provide: getRepositoryToken(Alfajor), useValue: { save: jest.fn() } },
        { provide: AlfajorFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    rejecter = module.get(AlfajorRejecter);
    repo = module.get(getRepositoryToken(Alfajor));
    finder = module.get(AlfajorFinder);
  });

  it('rejects a PENDING alfajor with the given reason', async () => {
    finder.byId.mockResolvedValue(baseAlfajor());
    repo.save.mockImplementation(async (a) => a as Alfajor);

    const result = await rejecter.execute('a1', {
      rejectionReason: 'foto borrosa',
    });

    expect(result.status).toBe(AlfajorStatus.REJECTED);
    expect(result.rejectionReason).toBe('foto borrosa');
  });

  it('throws BadRequest when alfajor is already APPROVED', async () => {
    finder.byId.mockResolvedValue(
      baseAlfajor({ status: AlfajorStatus.APPROVED }),
    );
    await expect(
      rejecter.execute('a1', { rejectionReason: 'x' }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws BadRequest when alfajor is already REJECTED', async () => {
    finder.byId.mockResolvedValue(
      baseAlfajor({ status: AlfajorStatus.REJECTED }),
    );
    await expect(
      rejecter.execute('a1', { rejectionReason: 'x' }),
    ).rejects.toThrow(BadRequestException);
  });
});
