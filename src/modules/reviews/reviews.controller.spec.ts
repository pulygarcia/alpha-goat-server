import { Test } from '@nestjs/testing';
import { UserRole } from '../users/domain/user-role.enum';
import { User } from '../users/domain/user.entity';
import { Review } from './domain/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewCreator } from './services/review-creator';
import { ReviewFinder } from './services/review-finder';
import { ReviewLikeToggler } from './services/review-like-toggler';
import { ReviewRemover } from './services/review-remover';
import { ReviewSearcher } from './services/review-searcher';
import { ReviewUpdater } from './services/review-updater';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let creator: jest.Mocked<ReviewCreator>;
  let finder: jest.Mocked<ReviewFinder>;
  let searcher: jest.Mocked<ReviewSearcher>;
  let updater: jest.Mocked<ReviewUpdater>;
  let remover: jest.Mocked<ReviewRemover>;
  let likes: jest.Mocked<ReviewLikeToggler>;

  const review = {
    id: 'r1',
    userId: 'u1',
    alfajorId: 'a1',
    ratingGeneral: 8,
    dulzor: 7,
    cantidadDDL: 9,
    calidadBano: 8,
    ratioTapaRelleno: 7.5,
    textura: 8,
    comentario: null,
    fotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Review;

  const user = { id: 'u1', role: UserRole.USER } as User;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        { provide: ReviewCreator, useValue: { execute: jest.fn() } },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
        { provide: ReviewSearcher, useValue: { execute: jest.fn() } },
        { provide: ReviewUpdater, useValue: { execute: jest.fn() } },
        { provide: ReviewRemover, useValue: { execute: jest.fn() } },
        { provide: ReviewLikeToggler, useValue: { like: jest.fn(), unlike: jest.fn() } },
      ],
    }).compile();

    controller = module.get(ReviewsController);
    creator = module.get(ReviewCreator);
    finder = module.get(ReviewFinder);
    searcher = module.get(ReviewSearcher);
    updater = module.get(ReviewUpdater);
    remover = module.get(ReviewRemover);
    likes = module.get(ReviewLikeToggler);
  });

  it('search returns paginated dtos', async () => {
    searcher.execute.mockResolvedValue({ items: [review], total: 1, page: 1, limit: 20 });
    const res = await controller.search({ page: 1, limit: 20 });
    expect(res.items[0].id).toBe('r1');
  });

  it('findOne returns response dto', async () => {
    finder.byId.mockResolvedValue(review);
    const res = await controller.findOne('r1');
    expect(res.id).toBe('r1');
  });

  it('create forwards dto and userId', async () => {
    creator.execute.mockResolvedValue(review);
    const dto = {
      alfajorId: 'a1',
      ratingGeneral: 8,
      dulzor: 7,
      cantidadDDL: 9,
      calidadBano: 8,
      ratioTapaRelleno: 7.5,
      textura: 8,
    };
    await controller.create(dto, user);
    expect(creator.execute).toHaveBeenCalledWith(dto, 'u1');
  });

  it('update forwards id, dto and userId', async () => {
    updater.execute.mockResolvedValue(review);
    await controller.update('r1', { dulzor: 9 }, user);
    expect(updater.execute).toHaveBeenCalledWith('r1', { dulzor: 9 }, 'u1');
  });

  it('remove forwards actor context', async () => {
    remover.execute.mockResolvedValue();
    await controller.remove('r1', user);
    expect(remover.execute).toHaveBeenCalledWith('r1', { id: 'u1', role: UserRole.USER });
  });

  it('like forwards reviewId and userId', async () => {
    likes.like.mockResolvedValue();
    await controller.like('r1', user);
    expect(likes.like).toHaveBeenCalledWith('r1', 'u1');
  });

  it('unlike forwards reviewId and userId', async () => {
    likes.unlike.mockResolvedValue();
    await controller.unlike('r1', user);
    expect(likes.unlike).toHaveBeenCalledWith('r1', 'u1');
  });
});
