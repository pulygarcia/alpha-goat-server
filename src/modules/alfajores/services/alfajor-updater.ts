import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import {
  ActorContext,
  assertCanEditAlfajor,
} from '../domain/assert-can-edit-alfajor';
import { UpdateAlfajorDto } from '../dto/update-alfajor.dto';
import { AlfajorFinder } from './alfajor-finder';

@Injectable()
export class AlfajorUpdater {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    private readonly finder: AlfajorFinder,
  ) {}

  async execute(
    id: string,
    dto: UpdateAlfajorDto,
    actor: ActorContext,
  ): Promise<Alfajor> {
    const alfajor = await this.finder.byId(id);

    assertCanEditAlfajor(alfajor, actor);

    if (dto.nombre && dto.nombre !== alfajor.nombre) {
      const taken = await this.alfajores.findOne({
        where: { nombre: dto.nombre, marcaId: alfajor.marcaId, id: Not(id) },
      });
      if (taken) {
        throw new ConflictException(
          `alfajor "${dto.nombre}" already exists for that marca`,
        );
      }
      alfajor.nombre = dto.nombre;
    }

    if (dto.tipo !== undefined) alfajor.tipo = dto.tipo;
    if (dto.descripcion !== undefined) alfajor.descripcion = dto.descripcion;
    if (dto.imagenUrl !== undefined) alfajor.imagenUrl = dto.imagenUrl;

    return this.alfajores.save(alfajor);
  }
}
