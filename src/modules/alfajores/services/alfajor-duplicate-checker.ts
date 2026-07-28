import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';

/**
 * Regla del unique `nombre + marcaId`, chequeada antes de guardar para que la
 * colisión salga como 409 y no como el 500 de la violación del índice.
 * La comparten `AlfajorCreator` (al proponer con marca del catálogo) y
 * `AlfajorApprover` (al resolver la marca de una propuesta libre).
 */
@Injectable()
export class AlfajorDuplicateChecker {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
  ) {}

  /** `excludeId` deja fuera al propio alfajor que se está aprobando. */
  async assertUnique(
    nombre: string,
    marcaId: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.alfajores.findOne({
      where: {
        nombre,
        marcaId,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (exists) {
      throw new ConflictException(
        `alfajor "${nombre}" already exists for that marca`,
      );
    }
  }
}
