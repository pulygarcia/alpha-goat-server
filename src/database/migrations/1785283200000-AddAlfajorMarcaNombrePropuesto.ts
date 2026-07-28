import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca libre al proponer un alfajor: `marca_id` pasa a nullable y se suma
 * `marca_nombre_propuesto`, el texto que escribió el usuario cuando la marca
 * no estaba en el catálogo. La combinación sin marca solo existe mientras el
 * alfajor está PENDING; el admin resuelve la marca al aprobar.
 *
 * Sin backfill: toda fila existente tiene marca.
 *
 * Ojo con el `down`: volver `marca_id` a NOT NULL falla si quedaron
 * propuestas con marca libre sin moderar. Hay que borrarlas (o resolverlas)
 * antes de revertir.
 */
export class AddAlfajorMarcaNombrePropuesto1785283200000
  implements MigrationInterface
{
  name = 'AddAlfajorMarcaNombrePropuesto1785283200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alfajores" ALTER COLUMN "marca_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "alfajores" ADD "marca_nombre_propuesto" character varying(120)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alfajores" DROP COLUMN "marca_nombre_propuesto"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alfajores" ALTER COLUMN "marca_id" SET NOT NULL`,
    );
  }
}
