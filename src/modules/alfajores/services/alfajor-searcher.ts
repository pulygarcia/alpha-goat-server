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
      .leftJoinAndSelect('a.marca', 'm');

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

    qb.orderBy('a.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }
}
