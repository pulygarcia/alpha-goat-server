import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { expand } from 'dotenv-expand';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

expand(loadEnv());

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: ['src/**/*.entity.{ts,js}'],
  migrations: ['src/database/migrations/*.{ts,js}'],
  namingStrategy: new SnakeNamingStrategy(),
});
