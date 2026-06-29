import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImageUploader } from '../../uploads/services/image-uploader';
import { Review } from '../domain/review.entity';
import { ReviewFinder } from './review-finder';
import { ReviewImageUpdater } from './review-image-updater';

describe('ReviewImageUpdater', () => {
  let updater: ReviewImageUpdater;
  let repo: jest.Mocked<Repository<Review>>;
  let finder: jest.Mocked<ReviewFinder>;
  let uploader: jest.Mocked<ImageUploader>;

  const baseReview = (overrides: Partial<Review> = {}): Review =>
    ({
      id: 'r1',
      userId: 'u1',
      alfajorId: 'a1',
      fotoUrl: null,
      ...overrides,
    }) as Review;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewImageUpdater,
        {
          provide: getRepositoryToken(Review),
          useValue: { save: jest.fn() },
        },
        { provide: ReviewFinder, useValue: { byId: jest.fn() } },
        { provide: ImageUploader, useValue: { upload: jest.fn() } },
      ],
    }).compile();

    updater = module.get(ReviewImageUpdater);
    repo = module.get(getRepositoryToken(Review));
    finder = module.get(ReviewFinder);
    uploader = module.get(ImageUploader);
  });

  it('author uploads: folder/publicId/overwrite + persists fotoUrl', async () => {
    const review = baseReview();
    finder.byId.mockResolvedValue(review);
    uploader.upload.mockResolvedValue({
      url: 'https://cdn/reviews/r1.png',
      publicId: 'reviews/r1',
    });
    repo.save.mockImplementation(async (r) => r as Review);

    const buffer = Buffer.from('img');
    const result = await updater.execute('r1', buffer, 'u1');

    expect(uploader.upload).toHaveBeenCalledWith(buffer, {
      folder: 'reviews',
      publicId: 'r1',
    });
    expect(repo.save).toHaveBeenCalledWith(review);
    expect(result.fotoUrl).toBe('https://cdn/reviews/r1.png');
  });

  it('throws NotFoundException when the review does not exist', async () => {
    finder.byId.mockRejectedValue(new NotFoundException());

    await expect(
      updater.execute('missing', Buffer.from('x'), 'u1'),
    ).rejects.toThrow(NotFoundException);
    expect(uploader.upload).not.toHaveBeenCalled();
  });

  it('rejects a non-author without uploading', async () => {
    finder.byId.mockResolvedValue(baseReview());

    await expect(
      updater.execute('r1', Buffer.from('x'), 'other'),
    ).rejects.toThrow(ForbiddenException);
    expect(uploader.upload).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('does not persist when the upload fails', async () => {
    finder.byId.mockResolvedValue(baseReview());
    uploader.upload.mockRejectedValue(new Error('cloudinary down'));

    await expect(updater.execute('r1', Buffer.from('x'), 'u1')).rejects.toThrow(
      'cloudinary down',
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});
