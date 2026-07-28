import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import { AvgEjes } from '../dto/alfajor-response.dto';

interface AveragesRaw {
  avgrating: string | null;
  avgdulzor: string | null;
  avgcantidadddl: string | null;
  avgcalidadbano: string | null;
  avgratiotaparelleno: string | null;
  avgtextura: string | null;
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

  // Subqueries correlacionadas (no relations:{reviews:true}) para no traer
  // todas las reviews solo para promediar unos números. Alias en minúsculas:
  // mixed-case rompe el pagination-wrapper de TypeORM (lección PR server #24).
  async byIdWithAverages(id: string): Promise<{
    alfajor: Alfajor;
    avgRating: number | null;
    avgEjes: AvgEjes | null;
  }> {
    const { entities, raw } = await this.alfajores
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.marca', 'm')
      .addSelect(avgOf('rating_general'), 'avgrating')
      .addSelect(avgOf('dulzor'), 'avgdulzor')
      .addSelect(avgOf('cantidad_ddl'), 'avgcantidadddl')
      .addSelect(avgOf('calidad_bano'), 'avgcalidadbano')
      .addSelect(avgOf('ratio_tapa_relleno'), 'avgratiotaparelleno')
      .addSelect(avgOf('textura'), 'avgtextura')
      .where('a.id = :id', { id })
      .getRawAndEntities<AveragesRaw>();

    const alfajor = entities[0];
    if (!alfajor) throw new NotFoundException(`alfajor ${id} not found`);

    const averages = raw[0];

    // Los 5 ejes son NOT NULL en reviews: o hay reseñas y están los seis
    // promedios, o no hay y son todos null. Por eso alcanza con mirar uno.
    const avgEjes: AvgEjes | null =
      averages.avgdulzor === null
        ? null
        : {
            dulzor: round1(averages.avgdulzor),
            cantidadDDL: round1(averages.avgcantidadddl),
            calidadBano: round1(averages.avgcalidadbano),
            ratioTapaRelleno: round1(averages.avgratiotaparelleno),
            textura: round1(averages.avgtextura),
          };

    return {
      alfajor,
      avgRating:
        averages.avgrating === null ? null : round2(averages.avgrating),
      avgEjes,
    };
  }
}

const avgOf = (column: string): string =>
  `(SELECT AVG(r.${column}) FROM reviews r WHERE r.alfajor_id = a.id)`;

// AVG sobre numeric devuelve string en pg.
const round2 = (value: string | number): number =>
  Number(Number(value).toFixed(2));

// Los ejes van a 1 decimal: alimentan las barras de la ficha, no el score
// protagonista, y el front los muestra con esa precisión.
const round1 = (value: string | number | null): number =>
  Number(Number(value).toFixed(1));
