import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';

@Injectable()
export class AlfajorFinder {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajores: Repository<Alfajor>,
  ) {}

  async byId(id: string): Promise<Alfajor> {
    const a = await this.alfajores.findOne({
      where: { id },
      relations: { marca: true },
    });
    if (!a) throw new NotFoundException(`alfajor ${id} not found`);
    return a;
  }
}
