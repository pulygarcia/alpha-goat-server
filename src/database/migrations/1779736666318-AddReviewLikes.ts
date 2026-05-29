import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewLikes1779736666318 implements MigrationInterface {
  name = 'AddReviewLikes1779736666318';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "review_likes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_review_like_user" UNIQUE ("review_id", "user_id"), CONSTRAINT "PK_927159e047aee5a52998ad31577" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3cd606c64c23bfb2e8634f91b6" ON "review_likes" ("review_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "review_likes" ADD CONSTRAINT "FK_3cd606c64c23bfb2e8634f91b69" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_likes" ADD CONSTRAINT "FK_eeb9d9410f16e3b743bd3c9b007" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "review_likes" DROP CONSTRAINT "FK_eeb9d9410f16e3b743bd3c9b007"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_likes" DROP CONSTRAINT "FK_3cd606c64c23bfb2e8634f91b69"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3cd606c64c23bfb2e8634f91b6"`,
    );
    await queryRunner.query(`DROP TABLE "review_likes"`);
  }
}
