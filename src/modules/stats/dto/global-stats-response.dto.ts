import { ApiProperty } from '@nestjs/swagger';
import type { GlobalStatsResult } from '../services/global-stats-finder';

export class GlobalStatsResponseDto {
  @ApiProperty({ example: 512 })
  reviewsTotal: number;

  @ApiProperty({ example: 128 })
  alfajoresTotal: number;

  @ApiProperty({ example: 340 })
  usersTotal: number;

  @ApiProperty({ example: 47 })
  alfajoresContributedByUsers: number;

  static from(result: GlobalStatsResult): GlobalStatsResponseDto {
    const dto = new GlobalStatsResponseDto();
    dto.reviewsTotal = result.reviewsTotal;
    dto.alfajoresTotal = result.alfajoresTotal;
    dto.usersTotal = result.usersTotal;
    dto.alfajoresContributedByUsers = result.alfajoresContributedByUsers;
    return dto;
  }
}
