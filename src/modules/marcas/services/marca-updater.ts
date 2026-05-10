import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Marca } from '../domain/marca.entity';
import { UpdateMarcaDto } from '../dto/update-marca.dto';
import { MarcaFinder } from './marca-finder';

@Injectable()
export class MarcaUpdater {
  constructor(
    @InjectRepository(Marca)
    private readonly marcas: Repository<Marca>,
    private readonly finder: MarcaFinder,
  ) {}

  async execute(id: string, dto: UpdateMarcaDto): Promise<Marca> {
    const marca = await this.finder.byId(id);

    if (dto.nombre && dto.nombre !== marca.nombre) {
      const taken = await this.marcas.findOne({
        where: { nombre: dto.nombre, id: Not(id) },
      });
      if (taken) throw new ConflictException(`marca "${dto.nombre}" already exists`);
      marca.nombre = dto.nombre;
    }

    if (dto.provincia !== undefined) marca.provincia = dto.provincia;
    if (dto.descripcion !== undefined) marca.descripcion = dto.descripcion;
    if (dto.logoUrl !== undefined) marca.logoUrl = dto.logoUrl;

    return this.marcas.save(marca);
  }
}
