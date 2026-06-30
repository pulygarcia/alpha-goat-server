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

function withUser(over: Partial<Review> = {}): Review {
  return buildReview({
    user: { id: 'u1', username: 'pepe', avatarUrl: null },
    ...over,
  } as Partial<Review>);
}

describe('ReviewResponseDto.from', () => {
  it('maps the nested author (isFollowing false by default) when loaded', () => {
    expect(ReviewResponseDto.from(withUser()).author).toEqual({
      id: 'u1',
      username: 'pepe',
      avatarUrl: null,
      isFollowing: false,
    });
  });

  it('leaves author null when the user relation is not loaded', () => {
    expect(ReviewResponseDto.from(buildReview()).author).toBeNull();
  });

  it('defaults counts to 0 and isFollowing/isLiked to false without extra', () => {
    const dto = ReviewResponseDto.from(withUser());
    expect(dto.likesCount).toBe(0);
    expect(dto.commentsCount).toBe(0);
    expect(dto.author?.isFollowing).toBe(false);
    expect(dto.isLiked).toBe(false);
  });

  it('maps likesCount, commentsCount, author.isFollowing and isLiked from the extra', () => {
    const dto = ReviewResponseDto.from(withUser(), {
      likesCount: 12,
      commentsCount: 3,
      isFollowing: true,
      isLiked: true,
    });
    expect(dto.likesCount).toBe(12);
    expect(dto.commentsCount).toBe(3);
    expect(dto.author?.isFollowing).toBe(true);
    expect(dto.isLiked).toBe(true);
  });

  it('maps the nested alfajor (with imagenUrl) and marca when the alfajor relation is loaded', () => {
    const review = buildReview({
      alfajor: {
        id: 'a1',
        nombre: 'Jorgito',
        tipo: 'CHOCOLATE',
        imagenUrl: 'https://cdn/alfajores/a1.png',
        marca: { nombre: 'Jorgito', provincia: 'Buenos Aires' },
      },
    } as Partial<Review>);
    const dto = ReviewResponseDto.from(review);
    expect(dto.alfajor).toEqual({
      id: 'a1',
      nombre: 'Jorgito',
      tipo: 'CHOCOLATE',
      imagenUrl: 'https://cdn/alfajores/a1.png',
    });
    expect(dto.marca).toEqual({ nombre: 'Jorgito', provincia: 'Buenos Aires' });
  });

  it('leaves alfajor and marca null when the alfajor relation is not loaded', () => {
    const dto = ReviewResponseDto.from(buildReview());
    expect(dto.alfajor).toBeNull();
    expect(dto.marca).toBeNull();
  });

  it('leaves marca null when the alfajor is loaded without its marca', () => {
    const review = buildReview({
      alfajor: {
        id: 'a1',
        nombre: 'Jorgito',
        tipo: 'CHOCOLATE',
        imagenUrl: null,
      },
    } as Partial<Review>);
    const dto = ReviewResponseDto.from(review);
    expect(dto.alfajor).toEqual({
      id: 'a1',
      nombre: 'Jorgito',
      tipo: 'CHOCOLATE',
      imagenUrl: null,
    });
    expect(dto.marca).toBeNull();
  });
});
