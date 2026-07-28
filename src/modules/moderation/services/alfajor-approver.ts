import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../../alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../alfajores/domain/alfajor-status.enum';
import { AlfajorDuplicateChecker } from '../../alfajores/services/alfajor-duplicate-checker';
import { AlfajorFinder } from '../../alfajores/services/alfajor-finder';
import { MarcaCreator } from '../../marcas/services/marca-creator';
import { MarcaFinder } from '../../marcas/services/marca-finder';
import { ApproveAlfajorDto } from '../dto/approve-alfajor.dto';

@Injectable()
export class AlfajorApprover {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    private readonly finder: AlfajorFinder,
    private readonly marcaFinder: MarcaFinder,
    private readonly marcaCreator: MarcaCreator,
    private readonly duplicateChecker: AlfajorDuplicateChecker,
  ) {}

  async execute(id: string, dto: ApproveAlfajorDto = {}): Promise<Alfajor> {
    const alfajor = await this.finder.byId(id);

    if (alfajor.status !== AlfajorStatus.PENDING) {
      throw new BadRequestException(
        `only PENDING alfajores can be approved (current: ${alfajor.status})`,
      );
    }

    const marcaId = await this.resolveMarcaId(alfajor, dto);

    // Sin marca el unique nombre+marcaId no aplica, así que dos propuestas
    // libres iguales conviven: la colisión aparece recién acá.
    if (marcaId !== alfajor.marcaId) {
      await this.duplicateChecker.assertUnique(alfajor.nombre, marcaId, id);
    }

    alfajor.marcaId = marcaId;
    alfajor.marcaNombrePropuesto = null;
    alfajor.status = AlfajorStatus.APPROVED;
    alfajor.rejectionReason = null;
    return this.alfajores.save(alfajor);
  }

  /**
   * Marca propia → la que eligió el admin → la propuesta en texto libre
   * (reusada si ya existe con ese nombre exacto, creada si no).
   */
  private async resolveMarcaId(
    alfajor: Alfajor,
    dto: ApproveAlfajorDto,
  ): Promise<string> {
    if (alfajor.marcaId) return alfajor.marcaId;

    if (dto.marcaId) {
      const marca = await this.marcaFinder.byId(dto.marcaId);
      return marca.id;
    }

    if (alfajor.marcaNombrePropuesto) {
      const nombre = alfajor.marcaNombrePropuesto;
      const existente = await this.marcaFinder.byNombre(nombre);
      if (existente) return existente.id;

      const creada = await this.marcaCreator.execute({ nombre });
      return creada.id;
    }

    throw new BadRequestException(
      'the alfajor has no marca: send a marcaId to approve it',
    );
  }
}
