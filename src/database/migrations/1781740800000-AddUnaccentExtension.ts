import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita la extensión `unaccent` de Postgres para búsquedas insensibles a
 * tildes (ej. "aguila" matchea "Águila"). La usa `AlfajorSearcher` con
 * `unaccent(nombre) ILIKE unaccent(:q)`.
 */
export class AddUnaccentExtension1781740800000 implements MigrationInterface {
  name = 'AddUnaccentExtension1781740800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
