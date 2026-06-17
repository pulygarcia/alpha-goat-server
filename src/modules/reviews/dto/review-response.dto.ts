import { ApiProperty } from '@nestjs/swagger';
import { Review } from '../domain/review.entity';

class ReviewAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
}

export class ReviewResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  /** Autor anidado cuando la relación `user` está cargada; `null` si no se pidió. */
  @ApiProperty({ type: ReviewAuthorDto, nullable: true })
  author: ReviewAuthorDto | null;
  @ApiProperty() alfajorId: string;
  @ApiProperty() ratingGeneral: number;
  @ApiProperty() dulzor: number;
  @ApiProperty() cantidadDDL: number;
  @ApiProperty() calidadBano: number;
  @ApiProperty() ratioTapaRelleno: number;
  @ApiProperty() textura: number;
  @ApiProperty({ nullable: true }) comentario: string | null;
  @ApiProperty({ nullable: true }) fotoUrl: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(r: Review): ReviewResponseDto {
    const dto = new ReviewResponseDto();
    dto.id = r.id;
    dto.userId = r.userId;
    dto.author = r.user
      ? {
          id: r.user.id,
          username: r.user.username,
          avatarUrl: r.user.avatarUrl,
        }
      : null;
    dto.alfajorId = r.alfajorId;
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
