import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { GlobalRankingRow } from './global-ranking-finder';

// Mismo piso que el ranking global: all-time, una nota suelta no debería
// coronar (ni escrachar) a nadie.
const MIN_REVIEWS = 5;

interface RankedRaw {
  alfajorId: string;
  score: string;
  reviewsCount: string;
}

/**
 * El peor votado all-time: peor promedio de ratingGeneral entre alfajores
 * APPROVED con al menos MIN_REVIEWS reseñas. Espeja `GlobalRankingFinder`
 * invertido y sin paginar: agregación por QueryBuilder + hidratación con la
 * marca. Devuelve null si ninguno califica (el controller responde 204).
 *
 * Desempate determinístico — `score ASC, reviewsCount DESC, id ASC`: entre
 * empatados en el fondo, gana el escrache el que más reseñas acumula.
 */
@Injectable()
export class WorstRankedFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
  ) {}

  async execute(): Promise<GlobalRankingRow | null> {
    // Comillas dobles en los orderBy por los alias camelCase (Postgres los
    // baja a lowercase). `limit` (no `take`): consulta raw, no entity-aware.
    const worst = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('a.id', 'alfajorId')
      .addSelect('AVG(r.ratingGeneral)', 'score')
      .addSelect('COUNT(*)', 'reviewsCount')
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .groupBy('a.id')
      .having('COUNT(*) >= :min', { min: MIN_REVIEWS })
      .orderBy('"score"', 'ASC')
      .addOrderBy('"reviewsCount"', 'DESC')
      .addOrderBy('a.id', 'ASC')
      .limit(1)
      .getRawOne<RankedRaw>();

    if (!worst) return null;

    const alfajor = await this.alfajores.findOne({
      where: { id: worst.alfajorId },
      relations: ['marca'],
    });
    if (!alfajor) return null;

    return {
      alfajor,
      score: round2(worst.score),
      reviewsCount: Number(worst.reviewsCount),
    };
  }
}

// AVG sobre numeric devuelve string en pg.
const round2 = (value: string | number): number =>
  Number(Number(value).toFixed(2));
