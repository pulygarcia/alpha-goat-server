import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarcaFinder } from '../../marcas/services/marca-finder';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { CreateAlfajorDto } from '../dto/create-alfajor.dto';
import { AlfajorDuplicateChecker } from './alfajor-duplicate-checker';

@Injectable()
export class AlfajorCreator {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    private readonly marcaFinder: MarcaFinder,
    private readonly duplicateChecker: AlfajorDuplicateChecker,
  ) {}

  async execute(dto: CreateAlfajorDto, createdById: string): Promise<Alfajor> {
    const { marcaId, marcaNombre, ...rest } = dto;

    // El DTO garantiza que viene exactamente uno de los dos. Con marca del
    // catálogo se valida como siempre; con marca libre el alfajor queda sin
    // marca y el admin la resuelve al aprobar (ahí se chequea el duplicado).
    if (marcaId) {
      await this.marcaFinder.byId(marcaId);
      await this.duplicateChecker.assertUnique(dto.nombre, marcaId);
    }

    const alfajor = this.alfajores.create({
      ...rest,
      marcaId: marcaId ?? null,
      marcaNombrePropuesto: marcaNombre ?? null,
      status: AlfajorStatus.PENDING,
      createdById,
    });
    return this.alfajores.save(alfajor);
  }
}
