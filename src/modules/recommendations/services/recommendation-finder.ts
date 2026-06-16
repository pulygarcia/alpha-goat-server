import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import {
  AXES,
  AxisVector,
  UserTasteFingerprint,
} from './user-taste-fingerprint';

/** Un alfajor recomendado, listo para el rail del feed. */
export interface RecommendationRow {
  /** Hidratado con su marca. */
  alfajor: Alfajor;
  /** Afinidad con la huella del usuario, 0..100; `null` en cold start. */
  matchPct: number | null;
  /** Fuerza de recomendación (match + calidad), para ordenar. */
  score: number;
}

// Piso de reviews para que el perfil del alfajor sea confiable; igual que el
// bar de confianza de ranking-weekly.
const MIN_REVIEWS = 3;
const DEFAULT_LIMIT = 6;
// El score pondera afinidad (0.7) vs calidad general (0.3): un calce perfecto
// con un alfajor flojo no debería ganarle a uno muy bien puntuado.
const MATCH_WEIGHT = 0.7;

interface CandidateRaw {
  alfajorId: string;
  dulzor: string;
  cantidadDDL: string;
  calidadBano: string;
  ratioTapaRelleno: string;
  textura: string;
  avgGeneral: string;
}

interface ScoredCandidate {
  alfajorId: string;
  matchPct: number | null;
  avgGeneral: number;
  score: number;
}

/**
 * Recomendaciones content-based sobre los 5 ejes. Dos pasos, como los finders del
 * feed/ranking:
 *  1) una query agrupada (QueryBuilder, inevitable por AVG/COUNT/GROUP BY/HAVING)
 *     arma el perfil comunitario de cada alfajor APPROVED que el usuario NO
 *     reseñó y que tiene >= MIN_REVIEWS;
 *  2) en TS se calcula `matchPct` (coseno entre la huella y el perfil), el
 *     `score` (mezcla match + calidad), se ordena y se toma el top N; luego se
 *     hidratan esos pocos alfajores con su marca preservando el orden.
 *
 * El match y el score van en TS para que cada escenario de scoring sea testeable.
 */
@Injectable()
export class RecommendationFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    private readonly fingerprint: UserTasteFingerprint,
  ) {}

  async execute(
    userId: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<RecommendationRow[]> {
    const [taste, candidates] = await Promise.all([
      this.fingerprint.build(userId),
      this.candidateProfiles(userId),
    ]);
    if (candidates.length === 0) return [];

    const scored = candidates
      .map((c) => scoreCandidate(c, taste))
      .sort(byScoreThenQuality)
      .slice(0, limit);

    const alfajores = await this.alfajores.find({
      where: { id: In(scored.map((s) => s.alfajorId)) },
      relations: ['marca'],
    });
    const byId = new Map(alfajores.map((a) => [a.id, a]));

    // Preserva el orden del ranking (scored ya viene ordenado).
    return scored
      .map((s) => {
        const alfajor = byId.get(s.alfajorId);
        if (!alfajor) return null;
        return { alfajor, matchPct: s.matchPct, score: s.score };
      })
      .filter((row): row is RecommendationRow => row !== null);
  }

  // Perfil comunitario (promedio de cada eje + del ratingGeneral) de los
  // alfajores APPROVED con piso de reviews que el usuario todavía no reseñó. El
  // NOT IN con la subquery de sus reviews excluye lo ya probado; con un usuario
  // sin reviews la subquery es vacía y entran todos (caso cold start).
  private candidateProfiles(userId: string): Promise<CandidateRaw[]> {
    return this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('a.id', 'alfajorId')
      .addSelect('AVG(r.dulzor)', 'dulzor')
      .addSelect('AVG(r.cantidadDDL)', 'cantidadDDL')
      .addSelect('AVG(r.calidadBano)', 'calidadBano')
      .addSelect('AVG(r.ratioTapaRelleno)', 'ratioTapaRelleno')
      .addSelect('AVG(r.textura)', 'textura')
      .addSelect('AVG(r.ratingGeneral)', 'avgGeneral')
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .andWhere(
        'a.id NOT IN (SELECT r2.alfajor_id FROM reviews r2 WHERE r2.user_id = :userId)',
        { userId },
      )
      .groupBy('a.id')
      .having('COUNT(*) >= :min', { min: MIN_REVIEWS })
      .getRawMany<CandidateRaw>();
  }
}

// AVG sobre numeric devuelve string en pg.
const round2 = (value: number): number => Number(value.toFixed(2));

const profileOf = (c: CandidateRaw): AxisVector => ({
  dulzor: Number(c.dulzor),
  cantidadDDL: Number(c.cantidadDDL),
  calidadBano: Number(c.calidadBano),
  ratioTapaRelleno: Number(c.ratioTapaRelleno),
  textura: Number(c.textura),
});

/**
 * Similitud coseno entre dos vectores de ejes (no-negativos → resultado 0..1).
 * Compara la *forma* del gusto, no la intensidad. Vector nulo → 0.
 */
export const cosine = (a: AxisVector, b: AxisVector): number => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const axis of AXES) {
    dot += a[axis] * b[axis];
    normA += a[axis] * a[axis];
    normB += b[axis] * b[axis];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const scoreCandidate = (
  c: CandidateRaw,
  taste: AxisVector | null,
): ScoredCandidate => {
  const avgGeneral = Number(c.avgGeneral);
  const quality = avgGeneral * 10; // 0..10 → 0..100, misma escala que matchPct

  if (taste === null) {
    // Cold start: sin huella, ordenamos por calidad y no exponemos match.
    return {
      alfajorId: c.alfajorId,
      matchPct: null,
      avgGeneral,
      score: round2(quality),
    };
  }

  const matchPct = Math.round(cosine(taste, profileOf(c)) * 100);
  const score = round2(MATCH_WEIGHT * matchPct + (1 - MATCH_WEIGHT) * quality);
  return { alfajorId: c.alfajorId, matchPct, avgGeneral, score };
};

// Ordena por score desc; desempata por calidad para que, a igual match, gane el
// mejor puntuado.
const byScoreThenQuality = (a: ScoredCandidate, b: ScoredCandidate): number =>
  b.score - a.score || b.avgGeneral - a.avgGeneral;
