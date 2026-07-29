import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import {
  ActorContext,
  assertCanEditAlfajor,
} from '../domain/assert-can-edit-alfajor';
import { UpdateAlfajorDto } from '../dto/update-alfajor.dto';
import { AlfajorDuplicateChecker } from './alfajor-duplicate-checker';
import { AlfajorFinder } from './alfajor-finder';

@Injectable()
export class AlfajorUpdater {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    private readonly finder: AlfajorFinder,
    private readonly duplicateChecker: AlfajorDuplicateChecker,
  ) {}

  async execute(
    id: string,
    dto: UpdateAlfajorDto,
    actor: ActorContext,
  ): Promise<Alfajor> {
    const alfajor = await this.finder.byId(id);

    assertCanEditAlfajor(alfajor, actor);

    if (dto.nombre && dto.nombre !== alfajor.nombre) {
      // Sin marca resuelta no hay par (nombre, marcaId) que chequear: es una
      // propuesta con marca libre y el duplicado se detecta al aprobar.
      if (alfajor.marcaId) {
        await this.duplicateChecker.assertUnique(
          dto.nombre,
          alfajor.marcaId,
          id,
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
