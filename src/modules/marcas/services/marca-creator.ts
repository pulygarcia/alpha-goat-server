import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marca } from '../domain/marca.entity';
import { CreateMarcaDto } from '../dto/create-marca.dto';

@Injectable()
export class MarcaCreator {
  constructor(
    @InjectRepository(Marca)
    private readonly marcas: Repository<Marca>,
  ) {}

  async execute(dto: CreateMarcaDto): Promise<Marca> {
    const exists = await this.marcas.findOne({ where: { nombre: dto.nombre } });
    if (exists) throw new ConflictException(`marca "${dto.nombre}" already exists`);

    const marca = this.marcas.create(dto);
    return this.marcas.save(marca);
  }
}
