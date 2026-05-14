import 'reflect-metadata';
import dataSource from '../data-source';
import { Alfajor } from '../../modules/alfajores/domain/alfajor.entity';
import { AlfajorStatus } from '../../modules/alfajores/domain/alfajor-status.enum';
import { AlfajorTipo } from '../../modules/alfajores/domain/alfajor-tipo.enum';
import { Marca } from '../../modules/marcas/domain/marca.entity';

type SeedAlfajor = {
  nombre: string;
  marcaNombre: string;
  tipo: AlfajorTipo;
  descripcion?: string;
};

const ALFAJORES: SeedAlfajor[] = [
  { nombre: 'Havanna Clásico', marcaNombre: 'Havanna', tipo: AlfajorTipo.NEGRO, descripcion: 'Tapas de cacao con dulce de leche, bañado en chocolate semiamargo.' },
  { nombre: 'Havanna Mixto', marcaNombre: 'Havanna', tipo: AlfajorTipo.OTRO, descripcion: 'Combinación de chocolate negro y baño blanco.' },
  { nombre: 'Havanna Dulce de Leche', marcaNombre: 'Havanna', tipo: AlfajorTipo.BLANCO, descripcion: 'Bañado en glaseado de azúcar con relleno de dulce de leche.' },

  { nombre: 'Cachafaz Chocolate', marcaNombre: 'Cachafaz', tipo: AlfajorTipo.CHOCOLATE, descripcion: 'Tapas de chocolate amargo con dulce de leche.' },
  { nombre: 'Cachafaz Maicena', marcaNombre: 'Cachafaz', tipo: AlfajorTipo.MAICENA, descripcion: 'Tapas de maicena con dulce de leche y coco rallado.' },

  { nombre: 'Jorgito Negro', marcaNombre: 'Jorgito', tipo: AlfajorTipo.NEGRO, descripcion: 'Clásico alfajor de chocolate negro con dulce de leche.' },
  { nombre: 'Jorgito Blanco', marcaNombre: 'Jorgito', tipo: AlfajorTipo.BLANCO, descripcion: 'Bañado en chocolate blanco con dulce de leche.' },
  { nombre: 'Jorgito Mousse', marcaNombre: 'Jorgito', tipo: AlfajorTipo.OTRO, descripcion: 'Versión con relleno de mousse de chocolate.' },

  { nombre: 'Guaymallén Simple Negro', marcaNombre: 'Guaymallén', tipo: AlfajorTipo.NEGRO },
  { nombre: 'Guaymallén Simple Blanco', marcaNombre: 'Guaymallén', tipo: AlfajorTipo.BLANCO },
  { nombre: 'Guaymallén Triple', marcaNombre: 'Guaymallén', tipo: AlfajorTipo.NEGRO, descripcion: 'Triple capa con doble relleno de dulce de leche.' },

  { nombre: 'Capitán del Espacio', marcaNombre: 'Capitán del Espacio', tipo: AlfajorTipo.NEGRO, descripcion: 'Alfajor artesanal con relleno generoso de dulce de leche.' },

  { nombre: 'Balcarce', marcaNombre: 'Balcarce', tipo: AlfajorTipo.OTRO, descripcion: 'Postre tradicional con merengue, crema y dulce de leche.' },

  { nombre: 'Fantoche Clásico', marcaNombre: 'Fantoche', tipo: AlfajorTipo.NEGRO, descripcion: 'Alfajor cordobés con dulce de leche y baño de chocolate.' },
  { nombre: 'Fantoche Blanco', marcaNombre: 'Fantoche', tipo: AlfajorTipo.BLANCO },

  { nombre: 'Águila Negro', marcaNombre: 'Águila', tipo: AlfajorTipo.NEGRO },
  { nombre: 'Águila Blanco', marcaNombre: 'Águila', tipo: AlfajorTipo.BLANCO },

  { nombre: 'Milka Oreo', marcaNombre: 'Milka', tipo: AlfajorTipo.OTRO, descripcion: 'Alfajor de chocolate Milka con relleno tipo Oreo.' },
  { nombre: 'Milka Mousse', marcaNombre: 'Milka', tipo: AlfajorTipo.CHOCOLATE },

  { nombre: 'Block', marcaNombre: 'Cofler', tipo: AlfajorTipo.NEGRO, descripcion: 'Triple capa con doble relleno, baño de chocolate.' },

  { nombre: 'Tofi Chocolate', marcaNombre: 'Tofi', tipo: AlfajorTipo.CHOCOLATE },
  { nombre: 'Tofi Blanco', marcaNombre: 'Tofi', tipo: AlfajorTipo.BLANCO },

  { nombre: 'Terrabusi Clásico', marcaNombre: 'Terrabusi', tipo: AlfajorTipo.NEGRO },
];

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    const marcaRepo = dataSource.getRepository(Marca);
    const alfajorRepo = dataSource.getRepository(Alfajor);

    const marcas = await marcaRepo.find();
    const marcasByNombre = new Map(marcas.map((m) => [m.nombre, m]));

    let created = 0;
    let skipped = 0;
    let missingMarca = 0;

    for (const data of ALFAJORES) {
      const marca = marcasByNombre.get(data.marcaNombre);
      if (!marca) {
        console.warn(`  [skip] marca no encontrada: "${data.marcaNombre}" (¿corriste el seed de marcas primero?)`);
        missingMarca++;
        continue;
      }

      const exists = await alfajorRepo.findOne({
        where: { nombre: data.nombre, marcaId: marca.id },
      });
      if (exists) {
        skipped++;
        continue;
      }

      await alfajorRepo.save(
        alfajorRepo.create({
          nombre: data.nombre,
          marcaId: marca.id,
          tipo: data.tipo,
          descripcion: data.descripcion ?? null,
          status: AlfajorStatus.APPROVED,
        }),
      );
      created++;
    }

    console.log(
      `Alfajores seed done. created=${created} skipped=${skipped} missingMarca=${missingMarca}`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
