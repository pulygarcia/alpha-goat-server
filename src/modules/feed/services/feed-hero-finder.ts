import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';

// De dónde salió el pick. El front rotula distinto cada caso: `weekly` es el
// "goat del momento", `allTime` es el mejor histórico — llamarlo "del momento"
// cuando el ganador no tiene actividad reciente miente sobre el dato.
export type FeedHeroScope = 'weekly' | 'allTime';

export interface FeedHeroResult {
  scope: FeedHeroScope;
  alfajor: Alfajor;
  ratings: {
    general: number;
    dulzor: number;
    cantidadDDL: number;
    calidadBano: number;
    ratioTapaRelleno: number;
    textura: number;
  };
  stats: {
    reviewsThisWeek: number;
    reviewsLastWeek: number;
    deltaPct: number | null;
    totalReviews: number;
  };
  period: { from: Date; to: Date };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Piso de reseñas para entrar al pick. Sin él, un alfajor con una sola reseña
// de 10 le gana a uno con treinta promediando 9.4: el promedio de n=1 no es un
// promedio. Es más bajo que el piso de 5 de `/ranking` a propósito — acá la
// ventana es de 7 días y con 5 casi nunca calificaría alguien, así que el hero
// caería siempre al fallback all-time y dejaría de ser "del momento".
const MIN_REVIEWS = 3;

// Una "ventana de tiempo" es un rango [from, to): un pedazo del eje temporal
// con un inicio incluido y un fin excluido (ej: los últimos 7 días).
// Lo usamos para acotar queries de reviews por fecha de creación.
interface TimeWindow {
  from: Date;
  to: Date;
}

@Injectable()
export class FeedHeroFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
  ) {}

  // `now` se inyecta como parámetro para poder testear ventanas de tiempo sin
  // tocar el reloj global. En prod siempre cae al default.
  async execute(now: Date = new Date()): Promise<FeedHeroResult | null> {
    const thisWeek: TimeWindow = {
      from: new Date(now.getTime() - WEEK_MS),
      to: now,
    };
    const lastWeek: TimeWindow = {
      from: new Date(thisWeek.from.getTime() - WEEK_MS),
      to: thisWeek.from,
    };

    // Pick: ganador de la semana; si nadie alcanzó el piso de reseñas en la
    // ventana, fallback al mejor histórico. Si tampoco hay histórico con
    // respaldo suficiente → null (el controller responde 204).
    let scope: FeedHeroScope = 'weekly';
    let winnerId = await this.pickByTimeWindow(thisWeek);
    if (!winnerId) {
      scope = 'allTime';
      winnerId = await this.pickAllTime();
    }
    if (!winnerId) return null;

    const alfajor = await this.alfajores.findOne({
      where: { id: winnerId },
      relations: { marca: true },
    });
    if (!alfajor) return null;

    const [ratings, reviewsThisWeek, reviewsLastWeek, totalReviews] =
      await Promise.all([
        this.averages(winnerId),
        this.countInTimeWindow(winnerId, thisWeek),
        this.countInTimeWindow(winnerId, lastWeek),
        this.reviews.count({ where: { alfajorId: winnerId } }),
      ]);

    // deltaPct = null cuando no había base la semana pasada (división por cero).
    // El front interpreta null como "sin comparación" y muestra solo el conteo.
    const deltaPct =
      reviewsLastWeek === 0
        ? null
        : ((reviewsThisWeek - reviewsLastWeek) / reviewsLastWeek) * 100;

    return {
      scope,
      alfajor,
      ratings,
      stats: { reviewsThisWeek, reviewsLastWeek, deltaPct, totalReviews },
      period: thisWeek,
    };
  }

  // Top 1 alfajor APPROVED por promedio de ratingGeneral dentro de la ventana
  // de tiempo, con al menos MIN_REVIEWS reseñas en esa misma ventana.
  // Desempate por #reviews (más respaldo gana entre empatados).
  // Las comillas dobles en `orderBy` son necesarias porque Postgres baja a
  // lowercase los identificadores sin comillar, y los aliases son camelCase.
  private async pickByTimeWindow(window: TimeWindow): Promise<string | null> {
    const row = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('r.alfajorId', 'alfajorId')
      .addSelect('COUNT(*)', 'reviewsCount')
      .addSelect('AVG(r.ratingGeneral)', 'avgRating')
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .andWhere('r.createdAt >= :from AND r.createdAt < :to', window)
      .groupBy('r.alfajorId')
      // HAVING y no WHERE: el piso se evalúa sobre el grupo ya agregado.
      .having('COUNT(*) >= :minReviews', { minReviews: MIN_REVIEWS })
      .orderBy('"avgRating"', 'DESC')
      .addOrderBy('"reviewsCount"', 'DESC')
      .limit(1)
      .getRawOne<{ alfajorId: string }>();
    return row?.alfajorId ?? null;
  }

  // Mismo ranking que pickByTimeWindow pero sin filtro temporal (fallback all-time).
  // El piso también aplica acá: un alfajor con una sola reseña no representa
  // al histórico mejor de lo que representa a la semana.
  private async pickAllTime(): Promise<string | null> {
    const row = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('r.alfajorId', 'alfajorId')
      .addSelect('COUNT(*)', 'reviewsCount')
      .addSelect('AVG(r.ratingGeneral)', 'avgRating')
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .groupBy('r.alfajorId')
      .having('COUNT(*) >= :minReviews', { minReviews: MIN_REVIEWS })
      .orderBy('"avgRating"', 'DESC')
      .addOrderBy('"reviewsCount"', 'DESC')
      .limit(1)
      .getRawOne<{ alfajorId: string }>();
    return row?.alfajorId ?? null;
  }

  // Promedios de los 6 ejes sobre TODAS las reviews del alfajor (no solo
  // las de la ventana) — el radar muestra la "huella" histórica.
  // AVG sobre numeric devuelve string en pg, por eso el cast manual.
  private async averages(
    alfajorId: string,
  ): Promise<FeedHeroResult['ratings']> {
    const row = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.ratingGeneral)', 'general')
      .addSelect('AVG(r.dulzor)', 'dulzor')
      .addSelect('AVG(r.cantidadDDL)', 'cantidadDDL')
      .addSelect('AVG(r.calidadBano)', 'calidadBano')
      .addSelect('AVG(r.ratioTapaRelleno)', 'ratioTapaRelleno')
      .addSelect('AVG(r.textura)', 'textura')
      .where('r.alfajorId = :alfajorId', { alfajorId })
      .getRawOne<Record<keyof FeedHeroResult['ratings'], string | null>>();

    const num = (v: string | null | undefined) =>
      v === null || v === undefined ? 0 : Number(Number(v).toFixed(2));

    return {
      general: num(row?.general),
      dulzor: num(row?.dulzor),
      cantidadDDL: num(row?.cantidadDDL),
      calidadBano: num(row?.calidadBano),
      ratioTapaRelleno: num(row?.ratioTapaRelleno),
      textura: num(row?.textura),
    };
  }

  // Cuenta reviews de un alfajor dentro de una ventana de tiempo.
  // Se reusa para "esta semana" y "semana pasada" (cálculo del delta).
  private countInTimeWindow(
    alfajorId: string,
    window: TimeWindow,
  ): Promise<number> {
    return this.reviews
      .createQueryBuilder('r')
      .where('r.alfajorId = :alfajorId', { alfajorId })
      .andWhere('r.createdAt >= :from AND r.createdAt < :to', window)
      .getCount();
  }
}
