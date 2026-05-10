import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarcaFinder } from '../../marcas/services/marca-finder';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { CreateAlfajorDto } from '../dto/create-alfajor.dto';

@Injectable()
export class AlfajorCreator {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
    private readonly marcaFinder: MarcaFinder,
  ) {}

  async execute(dto: CreateAlfajorDto, createdById: string): Promise<Alfajor> {
    // 404 si la marca no existe
    await this.marcaFinder.byId(dto.marcaId);

    const exists = await this.alfajores.findOne({
      where: { nombre: dto.nombre, marcaId: dto.marcaId },
    });
    if (exists) {
      throw new ConflictException(
        `alfajor "${dto.nombre}" already exists for that marca`,
      );
    }

    const alfajor = this.alfajores.create({
      ...dto,
      status: AlfajorStatus.PENDING,
      createdById,
    });
    return this.alfajores.save(alfajor);
  }
}
