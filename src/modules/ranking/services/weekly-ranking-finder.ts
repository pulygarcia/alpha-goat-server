import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';

export type WeeklyTrend = 'up' | 'down' | 'same' | 'new';

/** Un alfajor del top semanal listo para mostrar en el rail del feed. */
export interface WeeklyRankingRow {
  /** Hidratado con su marca. */
  alfajor: Alfajor;
  /** Promedio de ratingGeneral de la ventana actual, 2 decimales. */
  score: number;
  /** Dirección vs la ventana anterior; `new` si no tenía reviews. */
  trend: WeeklyTrend;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "Semana" rolling, como la del feed — la calendario dejaría el ranking vacío
// cada lunes a la mañana.
const WINDOW_DAYS = 7;
// Piso menor al 5 de marcas-featured porque la ventana es 4x más corta; 3 sigue
// bloqueando el caso de la única nota 10 de casualidad.
const MIN_REVIEWS = 3;
const DEFAULT_LIMIT = 5;

interface RankedRaw {
  alfajorId: string;
  score: string;
  prevScore: string | null;
}

/**
 * Top N alfajores de la semana por promedio de ratingGeneral, con `trend` vs la
 * semana anterior. Dos pasos, como MarcaFeaturedFinder:
 *  1) agregación (QueryBuilder, inevitable por AVG/COUNT/GROUP BY/HAVING) sobre
 *     las reviews de los últimos 14 días; cada ventana sale de un agregado con
 *     FILTER, así una sola pasada da score y prevScore por alfajor;
 *  2) hidratación de esos pocos alfajores con su marca vía repo-API,
 *     preservando el orden del ranking.
 *
 * El trend se decide en TS (no en SQL) para que la regla — redondear a 2
 * decimales ANTES de comparar, `new` con prevScore null — quede testeable.
 */
@Injectable()
export class WeeklyRankingFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
  ) {}

  // `now` y `limit` se inyectan para poder testear sin tocar el reloj global.
  async execute(
    now: Date = new Date(),
    limit: number = DEFAULT_LIMIT,
  ): Promise<WeeklyRankingRow[]> {
    const ranked = await this.rankByWeeklyScore(now, limit);
    if (ranked.length === 0) return [];

    const alfajores = await this.alfajores.find({
      where: { id: In(ranked.map((r) => r.alfajorId)) },
      relations: ['marca'],
    });
    const byId = new Map(alfajores.map((a) => [a.id, a]));

    // Preserva el orden del ranking (las filas vienen ordenadas por score).
    return ranked
      .map((row) => {
        const alfajor = byId.get(row.alfajorId);
        if (!alfajor) return null;
        return {
          alfajor,
          score: round2(row.score),
          trend: trendOf(row.score, row.prevScore),
        };
      })
      .filter((row): row is WeeklyRankingRow => row !== null);
  }

  // Paso 1: top `limit` alfajorId por promedio de ratingGeneral en la ventana
  // actual. El WHERE acota a 14 días y los FILTER reparten cada review en su
  // ventana; el HAVING aplica el piso SOLO a la actual (la anterior sirve como
  // baseline con 1 sola review). Comillas dobles en orderBy por el alias
  // camelCase (Postgres baja a lowercase).
  private async rankByWeeklyScore(
    now: Date,
    limit: number,
  ): Promise<RankedRaw[]> {
    const weekAgo = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
    const twoWeeksAgo = new Date(now.getTime() - 2 * WINDOW_DAYS * DAY_MS);
    return this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('a.id', 'alfajorId')
      .addSelect(
        'AVG(r.ratingGeneral) FILTER (WHERE r.createdAt >= :weekAgo)',
        'score',
      )
      .addSelect(
        'AVG(r.ratingGeneral) FILTER (WHERE r.createdAt < :weekAgo)',
        'prevScore',
      )
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .andWhere('r.createdAt >= :twoWeeksAgo', { twoWeeksAgo })
      .setParameter('weekAgo', weekAgo)
      .groupBy('a.id')
      .having('COUNT(*) FILTER (WHERE r.createdAt >= :weekAgo) >= :min', {
        min: MIN_REVIEWS,
      })
      .orderBy('"score"', 'DESC')
      .limit(limit)
      .getRawMany<RankedRaw>();
  }
}

// AVG sobre numeric devuelve string en pg.
const round2 = (value: string | number): number =>
  Number(Number(value).toFixed(2));

const trendOf = (current: string, prev: string | null): WeeklyTrend => {
  if (prev === null) return 'new';
  const cur = round2(current);
  const before = round2(prev);
  if (cur > before) return 'up';
  if (cur < before) return 'down';
  return 'same';
};
