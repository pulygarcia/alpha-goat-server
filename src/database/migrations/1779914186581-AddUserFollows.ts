import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserFollows1779914186581 implements MigrationInterface {
  name = 'AddUserFollows1779914186581';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_follows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "follower_id" uuid NOT NULL, "following_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_follow" UNIQUE ("follower_id", "following_id"), CONSTRAINT "PK_da8e8793113adf3015952880966" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f7af3bf8f2dcba61b4adc10823" ON "user_follows" ("follower_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a71643cec3110af425f92e76e" ON "user_follows" ("following_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" ADD CONSTRAINT "FK_f7af3bf8f2dcba61b4adc108239" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" ADD CONSTRAINT "FK_5a71643cec3110af425f92e76e5" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_follows" DROP CONSTRAINT "FK_5a71643cec3110af425f92e76e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" DROP CONSTRAINT "FK_f7af3bf8f2dcba61b4adc108239"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a71643cec3110af425f92e76e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f7af3bf8f2dcba61b4adc10823"`,
    );
    await queryRunner.query(`DROP TABLE "user_follows"`);
  }
}
