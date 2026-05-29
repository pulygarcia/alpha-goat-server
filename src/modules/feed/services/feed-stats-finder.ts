import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';

export interface FeedStatsResult {
  todayCount: number;
  weekCount: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class FeedStatsFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
  ) {}

  // `now` se inyecta para poder testear las ventanas hoy/semana sin tocar el
  // reloj global. En prod siempre cae al default.
  //
  // Las ventanas espejan las de `FeedFinder` (scope=today / scope=week) para que
  // los contadores del subnav coincidan exactamente con lo que listaría el feed:
  // - hoy: desde las 00:00 del día actual (inicio de día local).
  // - semana: ventana móvil de los últimos 7 días.
  async execute(now: Date = new Date()): Promise<FeedStatsResult> {
    const [todayCount, weekCount] = await Promise.all([
      this.countSince(startOfDay(now)),
      this.countSince(new Date(now.getTime() - WEEK_MS)),
    ]);
    return { todayCount, weekCount };
  }

  // Reviews de alfajores APPROVED creadas a partir de `from` (inclusive).
  private countSince(from: Date): Promise<number> {
    return this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .andWhere('r.createdAt >= :from', { from })
      .getCount();
  }
}

function startOfDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
