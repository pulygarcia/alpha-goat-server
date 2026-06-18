import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ReviewLike } from '../domain/review-like.entity';
import { Review } from '../domain/review.entity';
import { ReviewFinder } from './review-finder';
import { ReviewLikeToggler } from './review-like-toggler';

describe('ReviewLikeToggler', () => {
  let toggler: ReviewLikeToggler;
  let repo: jest.Mocked<Repository<ReviewLike>>;
  let finder: jest.Mocked<ReviewFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewLikeToggler,
        {
          provide: getRepositoryToken(ReviewLike),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
      ],
    }).compile();
    toggler = module.get(ReviewLikeToggler);
    repo = module.get(getRepositoryToken(ReviewLike));
    finder = module.get(ReviewFinder);
  });

  it('creates a like when none exists', async () => {
    finder.byId.mockResolvedValue({ id: 'r1' } as Review);
    repo.findOne.mockResolvedValue(null);
    const like = { reviewId: 'r1', userId: 'u1' } as ReviewLike;
    repo.create.mockReturnValue(like);

    await toggler.like('r1', 'u1');

    expect(repo.save).toHaveBeenCalledWith(like);
  });

  it('is idempotent when the like already exists', async () => {
    finder.byId.mockResolvedValue({ id: 'r1' } as Review);
    repo.findOne.mockResolvedValue({ id: 'l1' } as ReviewLike);

    await toggler.like('r1', 'u1');

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('deletes the like on unlike', async () => {
    await toggler.unlike('r1', 'u1');
    expect(repo.delete).toHaveBeenCalledWith({ reviewId: 'r1', userId: 'u1' });
  });

  it('returns the subset of reviewIds the user liked', async () => {
    repo.find.mockResolvedValue([{ reviewId: 'r1' }] as ReviewLike[]);

    const liked = await toggler.likedAmong('u1', ['r1', 'r2']);

    expect(liked).toEqual(new Set(['r1']));
  });

  it('returns an empty set without querying when there are no candidates', async () => {
    const liked = await toggler.likedAmong('u1', []);

    expect(liked).toEqual(new Set());
    expect(repo.find).not.toHaveBeenCalled();
  });
});
