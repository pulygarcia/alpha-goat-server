import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Recorte temporal/social del feed (chips del subnav del front).
export enum FeedScope {
  TODAY = 'today',
  WEEK = 'week',
  FOLLOWING = 'following',
  PROVINCE = 'province',
}

// Criterio de orden. `recent` es el default.
export enum FeedSort {
  LIKES = 'likes',
  RECENT = 'recent',
  RATING = 'rating',
}

export class FeedQueryDto {
  @ApiPropertyOptional({ enum: FeedScope })
  @IsOptional()
  @IsEnum(FeedScope)
  scope?: FeedScope;

  @ApiPropertyOptional({ enum: FeedSort, default: FeedSort.RECENT })
  @IsOptional()
  @IsEnum(FeedSort)
  sort: FeedSort = FeedSort.RECENT;

  // Requerido cuando scope=province. Se compara contra marca.provincia.
  @ApiPropertyOptional({ description: 'Provincia (requerida si scope=province)' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
