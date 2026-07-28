import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { SearchAlfajoresDto } from '../dto/search-alfajores.dto';

export interface PaginatedAlfajores {
  items: Alfajor[];
  total: number;
  page: number;
  limit: number;
  /** Promedio de ratingGeneral por alfajor de la página; null sin reseñas. */
  avgRatingById: Map<string, number | null>;
}

interface AvgRatingRaw {
  id: string;
  avgrating: string | null;
}

@Injectable()
export class AlfajorSearcher {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
  ) {}

  // includeAllStatuses solo para admin/moderation
  async execute(
    dto: SearchAlfajoresDto,
    options: { includeAllStatuses?: boolean } = {},
  ): Promise<PaginatedAlfajores> {
    const { q, marcaId, tipo, status, page, limit } = dto;

    const qb = this.alfajores
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.marca', 'm')
      .addSelect(
        '(SELECT COUNT(*) FROM reviews WHERE reviews.alfajor_id = a.id)',
        'reviewscount',
      );

    if (q) {
      // Insensible a mayúsculas (ILIKE) y a acentos (unaccent): "aguila" → "Águila".
      qb.andWhere('unaccent(a.nombre) ILIKE unaccent(:q)', { q: `%${q}%` });
    }
    if (marcaId) qb.andWhere('a.marcaId = :marcaId', { marcaId });
    if (tipo) qb.andWhere('a.tipo = :tipo', { tipo });

    if (options.includeAllStatuses) {
      if (status) qb.andWhere('a.status = :status', { status });
    } else {
      qb.andWhere('a.status = :status', { status: AlfajorStatus.APPROVED });
    }

    qb.orderBy('reviewscount', 'DESC')
      .addOrderBy('a.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const avgRatingById = await this.loadAvgRatings(items.map((a) => a.id));
    return { items, total, page, limit, avgRatingById };
  }

  // Consulta aparte por los ids de la página en vez de un addSelect: con joins
  // + skip/take TypeORM parte el SELECT en dos y el raw no alinea con las
  // entidades. Subquery correlacionada (no JOIN) para conservar los alfajores
  // sin reseñas; alias en minúsculas — lección PR server #24.
  private async loadAvgRatings(
    ids: string[],
  ): Promise<Map<string, number | null>> {
    if (ids.length === 0) return new Map();

    const rows = await this.alfajores
      .createQueryBuilder('a')
      .select('a.id', 'id')
      .addSelect(
        '(SELECT AVG(r.rating_general) FROM reviews r WHERE r.alfajor_id = a.id)',
        'avgrating',
      )
      .where('a.id IN (:...ids)', { ids })
      .getRawMany<AvgRatingRaw>();

    return new Map(
      rows.map((r) => [
        r.id,
        r.avgrating === null ? null : round2(r.avgrating),
      ]),
    );
  }
}

// AVG sobre numeric devuelve string en pg.
const round2 = (value: string): number => Number(Number(value).toFixed(2));
