import { ApiProperty } from '@nestjs/swagger';

export class FeedStatsDto {
  @ApiProperty({
    description: 'Reseñas de alfajores aprobados creadas hoy (desde las 00:00)',
  })
  todayCount: number;

  @ApiProperty({
    description: 'Reseñas de alfajores aprobados en los últimos 7 días',
  })
  weekCount: number;
}
