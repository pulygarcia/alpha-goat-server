import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { UserTasteFingerprint } from './user-taste-fingerprint';

const review = (over: Partial<Review>): Review =>
  ({
    ratingGeneral: 8,
    dulzor: 5,
    cantidadDDL: 5,
    calidadBano: 5,
    ratioTapaRelleno: 5,
    textura: 5,
    ...over,
  }) as Review;

describe('UserTasteFingerprint', () => {
  let svc: UserTasteFingerprint;
  let reviews: { find: jest.Mock };

  beforeEach(async () => {
    reviews = { find: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        UserTasteFingerprint,
        { provide: getRepositoryToken(Review), useValue: reviews },
      ],
    }).compile();
    svc = module.get(UserTasteFingerprint);
  });

  it('returns null when the user has no qualifying reviews (cold start)', async () => {
    reviews.find.mockResolvedValue([]);
    expect(await svc.build('u1')).toBeNull();
  });

  it("filters to the user's reviews of APPROVED alfajores", async () => {
    reviews.find.mockResolvedValue([review({})]);
    await svc.build('u1');
    expect(reviews.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', alfajor: { status: AlfajorStatus.APPROVED } },
      }),
    );
  });

  it('maps a single review to its own axis values', async () => {
    reviews.find.mockResolvedValue([
      review({ ratingGeneral: 7, dulzor: 9, textura: 3 }),
    ]);
    const f = await svc.build('u1');
    expect(f).toMatchObject({ dulzor: 9, textura: 3 });
  });

  it('weights axes by ratingGeneral so high-rated reviews dominate', async () => {
    reviews.find.mockResolvedValue([
      review({
        ratingGeneral: 9,
        dulzor: 10,
        cantidadDDL: 0,
        calidadBano: 0,
        ratioTapaRelleno: 0,
        textura: 0,
      }),
      review({
        ratingGeneral: 1,
        dulzor: 0,
        cantidadDDL: 0,
        calidadBano: 0,
        ratioTapaRelleno: 0,
        textura: 0,
      }),
    ]);
    const f = await svc.build('u1');
    // dulzor ponderado = (9*10 + 1*0) / (9 + 1) = 9
    expect(f!.dulzor).toBe(9);
  });

  it('returns null when every review weight is zero', async () => {
    reviews.find.mockResolvedValue([review({ ratingGeneral: 0 })]);
    expect(await svc.build('u1')).toBeNull();
  });
});
