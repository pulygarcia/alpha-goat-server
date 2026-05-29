import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { UpdateAlfajorDto } from '../dto/update-alfajor.dto';
import { AlfajorFinder } from './alfajor-finder';

export interface ActorContext {
  id: string;
  role: UserRole;
}

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

    this.assertCanEdit(alfajor, actor);

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

  private assertCanEdit(alfajor: Alfajor, actor: ActorContext): void {
    if (actor.role === UserRole.ADMIN) return;

    const isOwner = alfajor.createdById === actor.id;
    const isPending = alfajor.status === AlfajorStatus.PENDING;
    if (!isOwner || !isPending) {
      throw new ForbiddenException(
        'only the creator can edit while the alfajor is pending',
      );
    }
  }
}
