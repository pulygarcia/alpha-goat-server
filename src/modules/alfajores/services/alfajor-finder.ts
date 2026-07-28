import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';

interface AvgRatingRaw {
  avgrating: string | null;
}

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

  // Subquery correlacionada (no relations:{reviews:true}) para no traer
  // todas las reviews solo para promediar un número. Alias en minúsculas:
  // mixed-case rompe el pagination-wrapper de TypeORM (lección PR server #24).
  async byIdWithAverages(
    id: string,
  ): Promise<{ alfajor: Alfajor; avgRating: number | null }> {
    const { entities, raw } = await this.alfajores
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.marca', 'm')
      .addSelect(
        '(SELECT AVG(r.rating_general) FROM reviews r WHERE r.alfajor_id = a.id)',
        'avgrating',
      )
      .where('a.id = :id', { id })
      .getRawAndEntities<AvgRatingRaw>();

    const alfajor = entities[0];
    if (!alfajor) throw new NotFoundException(`alfajor ${id} not found`);

    const rawAvg = raw[0].avgrating;
    return { alfajor, avgRating: rawAvg === null ? null : round2(rawAvg) };
  }
}

// AVG sobre numeric devuelve string en pg.
const round2 = (value: string | number): number =>
  Number(Number(value).toFixed(2));
