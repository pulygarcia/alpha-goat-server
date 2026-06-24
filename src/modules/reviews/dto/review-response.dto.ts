import { ApiProperty } from '@nestjs/swagger';
import { Review } from '../domain/review.entity';

class ReviewAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
  /** Si el usuario actual sigue al autor (false para anónimos / sin sesión). */
  @ApiProperty() isFollowing: boolean;
}

class ReviewAlfajorDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() tipo: string;
}

class ReviewMarcaDto {
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) provincia: string | null;
}

/** Datos calculados que no viven en la entidad (los aporta el searcher). */
export interface ReviewResponseExtra {
  likesCount?: number;
  commentsCount?: number;
  isFollowing?: boolean;
  isLiked?: boolean;
}

export class ReviewResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  /** Autor anidado cuando la relación `user` está cargada; `null` si no se pidió. */
  @ApiProperty({ type: ReviewAuthorDto, nullable: true })
  author: ReviewAuthorDto | null;
  @ApiProperty() alfajorId: string;
  /** Alfajor anidado cuando la relación `alfajor` está cargada; `null` si no se pidió. */
  @ApiProperty({ type: ReviewAlfajorDto, nullable: true })
  alfajor: ReviewAlfajorDto | null;
  /** Marca del alfajor cuando la relación `alfajor.marca` está cargada; `null` si no. */
  @ApiProperty({ type: ReviewMarcaDto, nullable: true })
  marca: ReviewMarcaDto | null;
  @ApiProperty() ratingGeneral: number;
  @ApiProperty() dulzor: number;
  @ApiProperty() cantidadDDL: number;
  @ApiProperty() calidadBano: number;
  @ApiProperty() ratioTapaRelleno: number;
  @ApiProperty() textura: number;
  @ApiProperty({ nullable: true }) comentario: string | null;
  @ApiProperty({ nullable: true }) fotoUrl: string | null;
  @ApiProperty() likesCount: number;
  @ApiProperty() commentsCount: number;
  /** Si el usuario actual ya likeó esta reseña (false para anónimos / sin sesión). */
  @ApiProperty() isLiked: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(r: Review, extra: ReviewResponseExtra = {}): ReviewResponseDto {
    const dto = new ReviewResponseDto();
    dto.id = r.id;
    dto.userId = r.userId;
    dto.author = r.user
      ? {
          id: r.user.id,
          username: r.user.username,
          avatarUrl: r.user.avatarUrl,
          isFollowing: extra.isFollowing ?? false,
        }
      : null;
    dto.likesCount = extra.likesCount ?? 0;
    dto.commentsCount = extra.commentsCount ?? 0;
    dto.isLiked = extra.isLiked ?? false;
    dto.alfajorId = r.alfajorId;
    dto.alfajor = r.alfajor
      ? { id: r.alfajor.id, nombre: r.alfajor.nombre, tipo: r.alfajor.tipo }
      : null;
    dto.marca = r.alfajor?.marca
      ? {
          nombre: r.alfajor.marca.nombre,
          provincia: r.alfajor.marca.provincia,
        }
      : null;
    dto.ratingGeneral = r.ratingGeneral;
    dto.dulzor = r.dulzor;
    dto.cantidadDDL = r.cantidadDDL;
    dto.calidadBano = r.calidadBano;
    dto.ratioTapaRelleno = r.ratioTapaRelleno;
    dto.textura = r.textura;
    dto.comentario = r.comentario;
    dto.fotoUrl = r.fotoUrl;
    dto.createdAt = r.createdAt;
    dto.updatedAt = r.updatedAt;
    return dto;
  }
}

export class PaginatedReviewsDto {
  @ApiProperty({ type: [ReviewResponseDto] }) items: ReviewResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
