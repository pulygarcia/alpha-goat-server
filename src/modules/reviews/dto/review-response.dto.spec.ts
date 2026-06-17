import { ReviewResponseDto } from './review-response.dto';
import { Review } from '../domain/review.entity';

function buildReview(over: Partial<Review> = {}): Review {
  return {
    id: 'r1',
    userId: 'u1',
    alfajorId: 'a1',
    ratingGeneral: 8,
    dulzor: 7,
    cantidadDDL: 9,
    calidadBano: 8,
    ratioTapaRelleno: 6,
    textura: 8,
    comentario: null,
    fotoUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  };
}

describe('ReviewResponseDto.from', () => {
  it('maps the nested author when the user relation is loaded', () => {
    const r = buildReview({
      user: { id: 'u1', username: 'pepe', avatarUrl: null },
    } as Partial<Review>);

    expect(ReviewResponseDto.from(r).author).toEqual({
      id: 'u1',
      username: 'pepe',
      avatarUrl: null,
    });
  });

  it('leaves author null when the user relation is not loaded', () => {
    expect(ReviewResponseDto.from(buildReview()).author).toBeNull();
  });
});
