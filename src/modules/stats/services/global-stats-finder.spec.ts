import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { User } from '../../users/domain/user.entity';
import { GlobalStatsFinder } from './global-stats-finder';

describe('GlobalStatsFinder', () => {
  let finder: GlobalStatsFinder;
  let reviews: jest.Mocked<Repository<Review>>;
  let alfajores: jest.Mocked<Repository<Alfajor>>;
  let users: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GlobalStatsFinder,
        { provide: getRepositoryToken(Review), useValue: { count: jest.fn() } },
        {
          provide: getRepositoryToken(Alfajor),
          useValue: { count: jest.fn() },
        },
        { provide: getRepositoryToken(User), useValue: { count: jest.fn() } },
      ],
    }).compile();

    finder = module.get(GlobalStatsFinder);
    reviews = module.get(getRepositoryToken(Review));
    alfajores = module.get(getRepositoryToken(Alfajor));
    users = module.get(getRepositoryToken(User));
  });

  it('aggregates counters from each repository', async () => {
    reviews.count.mockResolvedValue(512);
    users.count.mockResolvedValue(340);
    alfajores.count
      .mockResolvedValueOnce(128) // alfajoresTotal (APPROVED)
      .mockResolvedValueOnce(47); // alfajoresContributedByUsers

    const result = await finder.execute();

    expect(result).toEqual({
      reviewsTotal: 512,
      alfajoresTotal: 128,
      usersTotal: 340,
      alfajoresContributedByUsers: 47,
    });
  });

  it('counts only APPROVED alfajores for alfajoresTotal', async () => {
    reviews.count.mockResolvedValue(0);
    users.count.mockResolvedValue(0);
    alfajores.count.mockResolvedValue(0);

    await finder.execute();

    expect(alfajores.count).toHaveBeenNthCalledWith(1, {
      where: { status: AlfajorStatus.APPROVED },
    });
  });

  it('counts APPROVED alfajores with a non-null createdById for alfajoresContributedByUsers', async () => {
    reviews.count.mockResolvedValue(0);
    users.count.mockResolvedValue(0);
    alfajores.count.mockResolvedValue(0);

    await finder.execute();

    expect(alfajores.count).toHaveBeenNthCalledWith(2, {
      where: {
        status: AlfajorStatus.APPROVED,
        createdById: Not(IsNull()),
      },
    });
  });
});
