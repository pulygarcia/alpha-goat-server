import { ApiProperty } from '@nestjs/swagger';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';
import { Album, AlbumHoja, AlbumSticker } from '../services/album-finder';

export class AlbumStatsDto {
  @ApiProperty() collected: number;
  @ApiProperty() total: number;
  /** collected/total·100, 2 decimales; 0 si total es 0. */
  @ApiProperty() pct: number;
}

class AlbumOwnerDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
}

class AlbumMarcaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ nullable: true }) logoUrl: string | null;
  @ApiProperty({ nullable: true }) provincia: string | null;
}

/** Una figurita: conseguida = el dueño del álbum reseñó ese alfajor. */
export class AlbumStickerDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty({ enum: AlfajorTipo }) tipo: AlfajorTipo;
  @ApiProperty({ nullable: true }) imagenUrl: string | null;
  /** Promedio comunitario de ratingGeneral, 2 decimales; null sin reviews. */
  @ApiProperty({ nullable: true }) avgRating: number | null;
  @ApiProperty() collected: boolean;
  /** ratingGeneral que le puso el dueño; null si no la consiguió. */
  @ApiProperty({ nullable: true }) myRating: number | null;
  @ApiProperty({ nullable: true }) reviewId: string | null;

  static from(sticker: AlbumSticker): AlbumStickerDto {
    return Object.assign(new AlbumStickerDto(), sticker);
  }
}

export class AlbumHojaDto {
  @ApiProperty({ type: AlbumMarcaDto }) marca: AlbumMarcaDto;
  @ApiProperty({ type: AlbumStatsDto }) stats: AlbumStatsDto;
  @ApiProperty({ type: [AlbumStickerDto] }) alfajores: AlbumStickerDto[];

  static from(hoja: AlbumHoja): AlbumHojaDto {
    const dto = new AlbumHojaDto();
    dto.marca = {
      id: hoja.marca.id,
      nombre: hoja.marca.nombre,
      logoUrl: hoja.marca.logoUrl ?? null,
      provincia: hoja.marca.provincia ?? null,
    };
    dto.stats = hoja.stats;
    dto.alfajores = hoja.alfajores.map((s) => AlbumStickerDto.from(s));
    return dto;
  }
}

export class AlbumResponseDto {
  @ApiProperty({ type: AlbumOwnerDto }) owner: AlbumOwnerDto;
  @ApiProperty({ type: AlbumStatsDto }) stats: AlbumStatsDto;
  @ApiProperty({ type: [AlbumHojaDto] }) hojas: AlbumHojaDto[];

  static from(album: Album): AlbumResponseDto {
    const dto = new AlbumResponseDto();
    dto.owner = {
      id: album.owner.id,
      username: album.owner.username,
      avatarUrl: album.owner.avatarUrl ?? null,
    };
    dto.stats = album.stats;
    dto.hojas = album.hojas.map((h) => AlbumHojaDto.from(h));
    return dto;
  }
}
