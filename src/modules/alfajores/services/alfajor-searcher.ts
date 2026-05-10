import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
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
    const where: FindOptionsWhere<Alfajor> = {};

    if (q) where.nombre = ILike(`%${q}%`);
    if (marcaId) where.marcaId = marcaId;
    if (tipo) where.tipo = tipo;

    if (options.includeAllStatuses) {
      if (status) where.status = status;
    } else {
      where.status = AlfajorStatus.APPROVED;
    }

    const [items, total] = await this.alfajores.findAndCount({
      where,
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
