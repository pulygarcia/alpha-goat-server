import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../domain/user-role.enum';
import { User } from '../domain/user.entity';

export interface ProfileExtra {
  followersCount: number;
  followingCount: number;
  reviewsCount: number;
  // true/false según el viewer; null cuando es el propio perfil.
  isFollowing: boolean | null;
  // El email solo se expone cuando el perfil es el del usuario autenticado.
  includeEmail: boolean;
  // Aportes a la comunidad (panel del perfil).
  commentsCount: number;
  alfajoresAddedCount: number;
  likesReceivedCount: number;
  // Promedio del rating general de sus reseñas; null si todavía no reseñó.
  avgScore: number | null;
}

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() createdAt: Date;
  @ApiProperty() followersCount: number;
  @ApiProperty() followingCount: number;
  @ApiProperty() reviewsCount: number;
  @ApiProperty() commentsCount: number;
  @ApiProperty() alfajoresAddedCount: number;
  @ApiProperty() likesReceivedCount: number;
  @ApiProperty({ nullable: true, type: Number }) avgScore: number | null;
  @ApiProperty({ nullable: true, type: Boolean }) isFollowing: boolean | null;
  @ApiPropertyOptional() email?: string;

  static from(user: User, extra: ProfileExtra): ProfileResponseDto {
    const dto = new ProfileResponseDto();
    dto.id = user.id;
    dto.username = user.username;
    dto.avatarUrl = user.avatarUrl;
    dto.role = user.role;
    dto.createdAt = user.createdAt;
    dto.followersCount = extra.followersCount;
    dto.followingCount = extra.followingCount;
    dto.reviewsCount = extra.reviewsCount;
    dto.commentsCount = extra.commentsCount;
    dto.alfajoresAddedCount = extra.alfajoresAddedCount;
    dto.likesReceivedCount = extra.likesReceivedCount;
    dto.avgScore = extra.avgScore;
    dto.isFollowing = extra.isFollowing;
    if (extra.includeEmail) dto.email = user.email;
    return dto;
  }
}
