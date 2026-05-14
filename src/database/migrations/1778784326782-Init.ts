import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1778784326782 implements MigrationInterface {
    name = 'Init1778784326782'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "username" character varying(50) NOT NULL, "password_hash" character varying(255) NOT NULL, "avatar_url" character varying(500), "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "banned" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`CREATE TABLE "marcas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(120) NOT NULL, "provincia" character varying(80), "descripcion" text, "logo_url" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0dabf9ed9a15bfb634cb675f7d4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_29f5713899c32a96a8900143c6" ON "marcas" ("nombre") `);
        await queryRunner.query(`CREATE TYPE "public"."alfajores_tipo_enum" AS ENUM('CHOCOLATE', 'BLANCO', 'NEGRO', 'FRUTAL', 'MAICENA', 'OTRO')`);
        await queryRunner.query(`CREATE TYPE "public"."alfajores_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "alfajores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "marca_id" uuid NOT NULL, "tipo" "public"."alfajores_tipo_enum" NOT NULL, "descripcion" text, "imagen_url" character varying(500), "status" "public"."alfajores_status_enum" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_alfajor_nombre_marca" UNIQUE ("nombre", "marca_id"), CONSTRAINT "PK_5eaae3dfd65768e05fdcb2975eb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_75c41d59b1fe6fd33821f998d7" ON "alfajores" ("marca_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c327e4912d63fb3bc1f9a6b2fd" ON "alfajores" ("status") `);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "alfajor_id" uuid NOT NULL, "rating_general" numeric(3,1) NOT NULL, "dulzor" numeric(3,1) NOT NULL, "cantidad_ddl" numeric(3,1) NOT NULL, "calidad_bano" numeric(3,1) NOT NULL, "ratio_tapa_relleno" numeric(3,1) NOT NULL, "textura" numeric(3,1) NOT NULL, "comentario" text, "foto_url" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_review_user_alfajor" UNIQUE ("user_id", "alfajor_id"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_728447781a30bc3fcfe5c2f1cd" ON "reviews" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c1057fb9f8d6ddd0fee12365ab" ON "reviews" ("alfajor_id") `);
        await queryRunner.query(`CREATE TABLE "comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "user_id" uuid NOT NULL, "contenido" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0fe168752ce3bb4e7376d81f7a" ON "comments" ("review_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4c675567d2a58f0b07cef09c13" ON "comments" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "comment_likes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "comment_id" uuid NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_comment_like_user" UNIQUE ("comment_id", "user_id"), CONSTRAINT "PK_2c299aaf1f903c45ee7e6c7b419" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2073bf518ef7017ec19319a65e" ON "comment_likes" ("comment_id") `);
        await queryRunner.query(`ALTER TABLE "alfajores" ADD CONSTRAINT "FK_75c41d59b1fe6fd33821f998d77" FOREIGN KEY ("marca_id") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alfajores" ADD CONSTRAINT "FK_1fca08aa146e4c7bc83157b4b5c" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_c1057fb9f8d6ddd0fee12365ab9" FOREIGN KEY ("alfajor_id") REFERENCES "alfajores"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_0fe168752ce3bb4e7376d81f7ad" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comment_likes" ADD CONSTRAINT "FK_2073bf518ef7017ec19319a65e5" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comment_likes" ADD CONSTRAINT "FK_bdba9a10c64ff58d36b09e3ac45" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comment_likes" DROP CONSTRAINT "FK_bdba9a10c64ff58d36b09e3ac45"`);
        await queryRunner.query(`ALTER TABLE "comment_likes" DROP CONSTRAINT "FK_2073bf518ef7017ec19319a65e5"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_0fe168752ce3bb4e7376d81f7ad"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_c1057fb9f8d6ddd0fee12365ab9"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`);
        await queryRunner.query(`ALTER TABLE "alfajores" DROP CONSTRAINT "FK_1fca08aa146e4c7bc83157b4b5c"`);
        await queryRunner.query(`ALTER TABLE "alfajores" DROP CONSTRAINT "FK_75c41d59b1fe6fd33821f998d77"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2073bf518ef7017ec19319a65e"`);
        await queryRunner.query(`DROP TABLE "comment_likes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c675567d2a58f0b07cef09c13"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0fe168752ce3bb4e7376d81f7a"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c1057fb9f8d6ddd0fee12365ab"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_728447781a30bc3fcfe5c2f1cd"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c327e4912d63fb3bc1f9a6b2fd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_75c41d59b1fe6fd33821f998d7"`);
        await queryRunner.query(`DROP TABLE "alfajores"`);
        await queryRunner.query(`DROP TYPE "public"."alfajores_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."alfajores_tipo_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_29f5713899c32a96a8900143c6"`);
        await queryRunner.query(`DROP TABLE "marcas"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
