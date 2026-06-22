import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';

/** Un alfajor del ranking global, listo para mostrar. */
export interface GlobalRankingRow {
  /** Hidratado con su marca. */
  alfajor: Alfajor;
  /** Promedio histórico de ratingGeneral, 2 decimales. */
  score: number;
  /** Cantidad de reseñas que entraron en el promedio. */
  reviewsCount: number;
}

export interface PaginatedRanking {
  rows: GlobalRankingRow[];
  total: number;
  page: number;
  limit: number;
}

// All-time, así que el piso es mayor que el 3 del weekly (cuya ventana es 4x
// más corta): 5 evita que un alfajor con una nota suelta de casualidad escale.
const MIN_REVIEWS = 5;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

interface RankedRaw {
  alfajorId: string;
  score: string;
  reviewsCount: string;
}

/**
 * Ranking global (all-time) de alfajores por promedio de ratingGeneral, con
 * piso de MIN_REVIEWS reseñas. Espeja el patrón de `WeeklyRankingFinder` (sin
 * ventana ni `trend`): dos pasos,
 *  1) agregación (QueryBuilder, inevitable por AVG/COUNT/GROUP BY/HAVING) sobre
 *     todas las reviews de alfajores APPROVED;
 *  2) hidratación de la página con su marca vía repo-API, preservando el orden.
 *
 * El orden es total y determinístico — `score DESC, reviewsCount DESC, id ASC`:
 * sin el desempate por id, dos alfajores empatados podrían cambiar de lugar
 * entre consultas y la paginación por offset repetiría o saltearía filas.
 */
@Injectable()
export class GlobalRankingFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
  ) {}

  async execute(
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedRanking> {
    const total = await this.countQualifying();
    if (total === 0) return { rows: [], total: 0, page, limit };

    const ranked = await this.rankPage(page, limit);
    if (ranked.length === 0) return { rows: [], total, page, limit };

    const alfajores = await this.alfajores.find({
      where: { id: In(ranked.map((r) => r.alfajorId)) },
      relations: ['marca'],
    });
    const byId = new Map(alfajores.map((a) => [a.id, a]));

    // Preserva el orden del ranking (las filas vienen ordenadas).
    const rows = ranked
      .map((row) => {
        const alfajor = byId.get(row.alfajorId);
        if (!alfajor) return null;
        return {
          alfajor,
          score: round2(row.score),
          reviewsCount: Number(row.reviewsCount),
        };
      })
      .filter((row): row is GlobalRankingRow => row !== null);

    return { rows, total, page, limit };
  }

  // La página del ranking. Comillas dobles en los orderBy por los alias
  // camelCase (Postgres los baja a lowercase). `offset`/`limit` (no skip/take):
  // es una consulta raw, no entity-aware.
  private async rankPage(page: number, limit: number): Promise<RankedRaw[]> {
    return this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('a.id', 'alfajorId')
      .addSelect('AVG(r.ratingGeneral)', 'score')
      .addSelect('COUNT(*)', 'reviewsCount')
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .groupBy('a.id')
      .having('COUNT(*) >= :min', { min: MIN_REVIEWS })
      .orderBy('"score"', 'DESC')
      .addOrderBy('"reviewsCount"', 'DESC')
      .addOrderBy('a.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<RankedRaw>();
  }

  // Cuántos alfajores pasan el piso. Trae sólo los ids agrupados y los cuenta:
  // el catálogo es chico (no millones de filas) y así el conteo comparte
  // exactamente el filtro/piso de la página.
  private async countQualifying(): Promise<number> {
    const rows = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('a.id', 'alfajorId')
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .groupBy('a.id')
      .having('COUNT(*) >= :min', { min: MIN_REVIEWS })
      .getRawMany<{ alfajorId: string }>();
    return rows.length;
  }
}

// AVG sobre numeric devuelve string en pg.
const round2 = (value: string | number): number =>
  Number(Number(value).toFixed(2));
