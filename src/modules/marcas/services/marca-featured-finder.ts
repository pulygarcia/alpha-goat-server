import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { Review } from '../../reviews/domain/review.entity';
import { Marca } from '../domain/marca.entity';

/** Una marca "en foco" lista para mostrar en el rail del feed. */
export interface FeaturedMarcaRow {
  marca: Marca;
  /** Alfajores APPROVED de la marca (histórico). */
  productCount: number;
  /** Promedio histórico de ratingGeneral de la marca. */
  avgScore: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Ventana de ranking: más ancha que la "semana" del feed porque la controversia
// necesita juntar muestra para que la dispersión sea estable.
const WINDOW_DAYS = 30;
// Mínimo de reviews en la ventana para que el desvío estándar no sea ruido
// (2 notas 1 y 10 dan dispersión enorme por casualidad, no por opinión dividida).
const MIN_REVIEWS = 5;
const DEFAULT_LIMIT = 5;

/**
 * Selecciona las marcas "en foco" para el rail del feed por CONTROVERSIA: qué tan
 * dividida está la opinión reciente sobre la marca. La señal es la dispersión
 * (STDDEV) del ratingGeneral en la ventana — ni el conteo (eso es popularidad) ni
 * el promedio (no distingue consenso de guerra) sirven para esto.
 *
 * Dos pasos, como FeedFinder:
 *  1) agregación (QueryBuilder, inevitable por STDDEV/COUNT/GROUP BY) que rankea y
 *     devuelve sólo los marcaId ganadores;
 *  2) hidratación de esas pocas marcas con la repo-API + sus datos de display
 *     (productCount/avgScore históricos), preservando el orden del ranking.
 */
@Injectable()
export class MarcaFeaturedFinder {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    @InjectRepository(Marca)
    private readonly marcas: Repository<Marca>,
  ) {}

  // `now` y `limit` se inyectan para poder testear sin tocar el reloj global.
  async execute(
    now: Date = new Date(),
    limit: number = DEFAULT_LIMIT,
  ): Promise<FeaturedMarcaRow[]> {
    const ids = await this.rankByControversy(now, limit);
    if (ids.length === 0) return [];

    const [marcas, productCount, avgScore] = await Promise.all([
      this.marcas.find({ where: { id: In(ids) } }),
      this.productCountByMarca(ids),
      this.avgScoreByMarca(ids),
    ]);

    const byId = new Map(marcas.map((m) => [m.id, m]));

    // Preserva el orden del ranking (los ids vienen ordenados por controversia).
    return ids
      .map((id) => {
        const marca = byId.get(id);
        if (!marca) return null;
        return {
          marca,
          productCount: productCount.get(id) ?? 0,
          avgScore: avgScore.get(id) ?? 0,
        };
      })
      .filter((row): row is FeaturedMarcaRow => row !== null);
  }

  // Paso 1: top `limit` marcaId por dispersión del ratingGeneral en la ventana,
  // sólo reviews de alfajores APPROVED, con un piso de muestra. Las comillas
  // dobles en orderBy/having son por el alias camelCase (Postgres baja a lowercase).
  private async rankByControversy(now: Date, limit: number): Promise<string[]> {
    const from = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
    const rows = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('a.marcaId', 'marcaId')
      .addSelect('STDDEV_SAMP(r.ratingGeneral)', 'controversy')
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .andWhere('r.createdAt >= :from', { from })
      .groupBy('a.marcaId')
      .having('COUNT(*) >= :min', { min: MIN_REVIEWS })
      .orderBy('"controversy"', 'DESC')
      .limit(limit)
      .getRawMany<{ marcaId: string }>();
    return rows.map((row) => row.marcaId);
  }

  // Display: cantidad de alfajores APPROVED por marca (histórico), acotado a los ids.
  private async productCountByMarca(
    ids: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.alfajores
      .createQueryBuilder('a')
      .select('a.marcaId', 'marcaId')
      .addSelect('COUNT(*)', 'productCount')
      .where('a.marcaId IN (:...ids)', { ids })
      .andWhere('a.status = :status', { status: AlfajorStatus.APPROVED })
      .groupBy('a.marcaId')
      .getRawMany<{ marcaId: string; productCount: string }>();
    return new Map(rows.map((r) => [r.marcaId, Number(r.productCount)]));
  }

  // Display: promedio histórico de ratingGeneral por marca (sobre alfajores
  // APPROVED), acotado a los ids. AVG sobre numeric devuelve string en pg.
  private async avgScoreByMarca(ids: string[]): Promise<Map<string, number>> {
    const rows = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.alfajor', 'a')
      .select('a.marcaId', 'marcaId')
      .addSelect('AVG(r.ratingGeneral)', 'avgScore')
      .where('a.marcaId IN (:...ids)', { ids })
      .andWhere('a.status = :status', { status: AlfajorStatus.APPROVED })
      .groupBy('a.marcaId')
      .getRawMany<{ marcaId: string; avgScore: string | null }>();
    return new Map(
      rows.map((r) => [
        r.marcaId,
        r.avgScore === null ? 0 : Number(Number(r.avgScore).toFixed(2)),
      ]),
    );
  }
}
