import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Marca } from '../domain/marca.entity';
import { SearchMarcasDto } from '../dto/search-marcas.dto';

export interface PaginatedMarcas {
  items: Marca[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class MarcaSearcher {
  constructor(
    @InjectRepository(Marca)
    private readonly marcas: Repository<Marca>,
  ) {}

  async execute(dto: SearchMarcasDto): Promise<PaginatedMarcas> {
    const { q, page, limit } = dto;
    const where = q ? { nombre: ILike(`%${q}%`) } : {};

    const [items, total] = await this.marcas.findAndCount({
      where,
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
