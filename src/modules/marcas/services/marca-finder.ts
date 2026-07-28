import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marca } from '../domain/marca.entity';

@Injectable()
export class MarcaFinder {
  constructor(
    @InjectRepository(Marca)
    private readonly marcas: Repository<Marca>,
  ) {}

  async byId(id: string): Promise<Marca> {
    const marca = await this.marcas.findOne({ where: { id } });
    if (!marca) throw new NotFoundException(`marca ${id} not found`);
    return marca;
  }

  /**
   * Match exacto por nombre, para resolver una marca propuesta en texto libre
   * sin duplicarla. Devuelve `null` en vez de tirar: no encontrarla es el caso
   * esperado (ahí se crea la marca).
   */
  byNombre(nombre: string): Promise<Marca | null> {
    return this.marcas.findOne({ where: { nombre } });
  }
}
