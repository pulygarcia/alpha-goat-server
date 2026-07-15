import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorTipo } from '../../alfajores/domain/alfajor-tipo.enum';
import { Marca } from '../../marcas/domain/marca.entity';
import { Review } from '../../reviews/domain/review.entity';
import { User } from '../../users/domain/user.entity';
import { UserFinder } from '../../users/services/user-finder';

export interface AlbumStats {
  collected: number;
  total: number;
  /** collected/total·100, 2 decimales; 0 si total es 0. */
  pct: number;
}

export interface AlbumSticker {
  id: string;
  nombre: string;
  tipo: AlfajorTipo;
  imagenUrl: string | null;
  /** Promedio comunitario de ratingGeneral, 2 decimales; null sin reviews. */
  avgRating: number | null;
  /** Conseguida = el dueño del álbum la reseñó. */
  collected: boolean;
  myRating: number | null;
  reviewId: string | null;
}

export interface AlbumHoja {
  marca: Marca;
  stats: AlbumStats;
  alfajores: AlbumSticker[];
}

export interface Album {
  owner: User;
  stats: AlbumStats;
  hojas: AlbumHoja[];
}

interface CatalogRaw {
  id: string;
  nombre: string;
  tipo: AlfajorTipo;
  imagenUrl: string | null;
  marcaId: string;
  avgrating: string | null;
}

/**
 * Álbum de figuritas completo de un usuario: todo el catálogo APPROVED en
 * hojas por marca, con `collected` según las reviews del DUEÑO del álbum
 * (reseñar = pegar; no hay otra acción). Tres lecturas acotadas + merge en TS:
 *  1) catálogo con avgRating vía subquery correlacionada (QueryBuilder,
 *     inevitable por el AVG; alias en minúsculas — ver PR #24);
 *  2) reviews del dueño (repo-API, solo los campos del overlay);
 *  3) marcas del catálogo (repo-API, In(ids)).
 * Orden y stats se resuelven en TS para que las reglas queden testeables.
 */
@Injectable()
export class AlbumFinder {
  constructor(
    private readonly userFinder: UserFinder,
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Marca)
    private readonly marcas: Repository<Marca>,
  ) {}

  async execute(username: string): Promise<Album> {
    const owner = await this.userFinder.byUsernameOrFail(username);

    const catalog = await this.loadCatalog();
    if (catalog.length === 0) {
      return { owner, stats: { collected: 0, total: 0, pct: 0 }, hojas: [] };
    }

    const [ownerReviews, marcas] = await Promise.all([
      this.reviews.find({
        where: { userId: owner.id },
        select: ['id', 'alfajorId', 'ratingGeneral'],
      }),
      this.marcas.find({
        where: { id: In([...new Set(catalog.map((c) => c.marcaId))]) },
      }),
    ]);

    return this.assemble(owner, catalog, ownerReviews, marcas);
  }

  // Subquery correlacionada en vez de JOIN+GROUP BY para conservar los
  // alfajores sin reviews (avgRating null) sin ensuciar el SELECT principal.
  private loadCatalog(): Promise<CatalogRaw[]> {
    return this.alfajores
      .createQueryBuilder('a')
      .select('a.id', 'id')
      .addSelect('a.nombre', 'nombre')
      .addSelect('a.tipo', 'tipo')
      .addSelect('a.imagenUrl', 'imagenUrl')
      .addSelect('a.marcaId', 'marcaId')
      .addSelect(
        '(SELECT AVG(r.rating_general) FROM reviews r WHERE r.alfajor_id = a.id)',
        'avgrating',
      )
      .where('a.status = :status', { status: AlfajorStatus.APPROVED })
      .getRawMany<CatalogRaw>();
  }

  private assemble(
    owner: User,
    catalog: CatalogRaw[],
    ownerReviews: Review[],
    marcas: Marca[],
  ): Album {
    const reviewByAlfajor = new Map(ownerReviews.map((r) => [r.alfajorId, r]));
    const marcaById = new Map(marcas.map((m) => [m.id, m]));

    const byMarca = new Map<string, AlbumSticker[]>();
    for (const row of catalog) {
      const review = reviewByAlfajor.get(row.id);
      const sticker: AlbumSticker = {
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        imagenUrl: row.imagenUrl,
        avgRating: row.avgrating === null ? null : round2(row.avgrating),
        collected: review !== undefined,
        myRating: review?.ratingGeneral ?? null,
        reviewId: review?.id ?? null,
      };
      const stickers = byMarca.get(row.marcaId) ?? [];
      stickers.push(sticker);
      byMarca.set(row.marcaId, stickers);
    }

    const hojas: AlbumHoja[] = [...byMarca.entries()]
      .map(([marcaId, stickers]) => {
        stickers.sort(byRatingDescNullsLast);
        return {
          marca: marcaById.get(marcaId),
          stats: statsOf(stickers),
          alfajores: stickers,
        };
      })
      .filter((hoja): hoja is AlbumHoja => hoja.marca !== undefined)
      .sort((a, b) => a.marca.nombre.localeCompare(b.marca.nombre, 'es'));

    const collected = hojas.reduce((sum, h) => sum + h.stats.collected, 0);
    const total = hojas.reduce((sum, h) => sum + h.stats.total, 0);
    return {
      owner,
      stats: { collected, total, pct: pctOf(collected, total) },
      hojas,
    };
  }
}

// AVG sobre numeric devuelve string en pg.
const round2 = (value: string | number): number =>
  Number(Number(value).toFixed(2));

const pctOf = (collected: number, total: number): number =>
  total === 0 ? 0 : round2((collected / total) * 100);

const statsOf = (stickers: AlbumSticker[]): AlbumStats => {
  const collected = stickers.filter((s) => s.collected).length;
  return {
    collected,
    total: stickers.length,
    pct: pctOf(collected, stickers.length),
  };
};

// Los "cracks" arriba; sin reviews al fondo; nombre como desempate estable.
const byRatingDescNullsLast = (a: AlbumSticker, b: AlbumSticker): number => {
  if (a.avgRating === null && b.avgRating === null)
    return a.nombre.localeCompare(b.nombre, 'es');
  if (a.avgRating === null) return 1;
  if (b.avgRating === null) return -1;
  if (a.avgRating !== b.avgRating) return b.avgRating - a.avgRating;
  return a.nombre.localeCompare(b.nombre, 'es');
};
