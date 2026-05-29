import 'reflect-metadata';
import dataSource from '../data-source';
import { Marca } from '../../modules/marcas/domain/marca.entity';

const MARCAS: Array<Pick<Marca, 'nombre' | 'provincia' | 'descripcion'>> = [
  {
    nombre: 'Havanna',
    provincia: 'Buenos Aires',
    descripcion:
      'Marca marplatense fundada en 1948, ícono del alfajor argentino.',
  },
  {
    nombre: 'Cachafaz',
    provincia: 'Buenos Aires',
    descripcion:
      'Alfajores artesanales premium con dulce de leche y chocolate semiamargo.',
  },
  {
    nombre: 'Jorgito',
    provincia: 'Buenos Aires',
    descripcion: 'Marca popular argentina, líder en alfajores de góndola.',
  },
  {
    nombre: 'Guaymallén',
    provincia: 'Buenos Aires',
    descripcion: 'Alfajores económicos y populares, clásicos del kiosco.',
  },
  {
    nombre: 'Capitán del Espacio',
    provincia: 'Buenos Aires',
    descripcion:
      'Alfajores tradicionales con relleno generoso, fundada en 1948.',
  },
  {
    nombre: 'Balcarce',
    provincia: 'Buenos Aires',
    descripcion: 'Marca homónima a la ciudad bonaerense, clásica del sur.',
  },
  {
    nombre: 'Fantoche',
    provincia: 'Córdoba',
    descripcion: 'Marca cordobesa tradicional, popular en el interior.',
  },
  {
    nombre: 'Águila',
    provincia: 'Buenos Aires',
    descripcion: 'Marca histórica de chocolates y alfajores argentinos.',
  },
  {
    nombre: 'Milka',
    provincia: 'Buenos Aires',
    descripcion:
      'Marca internacional de Mondelez con línea local de alfajores.',
  },
  {
    nombre: 'Cofler',
    provincia: 'Buenos Aires',
    descripcion: 'Línea de chocolates y alfajores de Arcor (incluye Block).',
  },
  {
    nombre: 'Tofi',
    provincia: 'Buenos Aires',
    descripcion: 'Línea de Arcor, alfajores de chocolate con dulce de leche.',
  },
  {
    nombre: 'Terrabusi',
    provincia: 'Buenos Aires',
    descripcion: 'Marca histórica de galletitas y alfajores de Mondelez.',
  },
];

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    const repo = dataSource.getRepository(Marca);
    let created = 0;
    let skipped = 0;

    for (const data of MARCAS) {
      const exists = await repo.findOne({ where: { nombre: data.nombre } });
      if (exists) {
        skipped++;
        continue;
      }
      await repo.save(repo.create(data));
      created++;
    }

    console.log(`Marcas seed done. created=${created} skipped=${skipped}`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
