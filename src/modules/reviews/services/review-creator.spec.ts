import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorFinder } from '../../alfajores/services/alfajor-finder';
import { Review } from '../domain/review.entity';
import { ReviewCreator } from './review-creator';

describe('ReviewCreator', () => {
  let creator: ReviewCreator;
  let repo: jest.Mocked<Repository<Review>>;
  let finder: jest.Mocked<AlfajorFinder>;

  const dto = {
    alfajorId: 'a1',
    ratingGeneral: 8,
    dulzor: 7,
    cantidadDDL: 9,
    calidadBano: 8,
    ratioTapaRelleno: 7.5,
    textura: 8,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewCreator,
        {
          provide: getRepositoryToken(Review),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        { provide: AlfajorFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();

    creator = module.get(ReviewCreator);
    repo = module.get(getRepositoryToken(Review));
    finder = module.get(AlfajorFinder);
  });

  it('creates a review when alfajor is approved and no duplicate exists', async () => {
    finder.byId.mockResolvedValue({ status: AlfajorStatus.APPROVED } as Alfajor);
    repo.findOne.mockResolvedValue(null);
    const created = { id: 'r1' } as Review;
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue(created);

    const result = await creator.execute(dto, 'u1');

    expect(result).toBe(created);
    expect(repo.create).toHaveBeenCalledWith({ ...dto, userId: 'u1' });
  });

  it('throws BadRequestException when alfajor is not approved', async () => {
    finder.byId.mockResolvedValue({ status: AlfajorStatus.PENDING } as Alfajor);

    await expect(creator.execute(dto, 'u1')).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws ConflictException when user already reviewed the alfajor', async () => {
    finder.byId.mockResolvedValue({ status: AlfajorStatus.APPROVED } as Alfajor);
    repo.findOne.mockResolvedValue({ id: 'existing' } as Review);

    await expect(creator.execute(dto, 'u1')).rejects.toThrow(ConflictException);
  });
});
