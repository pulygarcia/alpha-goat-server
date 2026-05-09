import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { NodeEnv } from './env.validation';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService): TypeOrmModuleOptions => {
    const nodeEnv = config.get<NodeEnv>('NODE_ENV');
    const isProd = nodeEnv === NodeEnv.Production;

    return {
      type: 'postgres',
      url: config.get<string>('DATABASE_URL'),
      ssl: { rejectUnauthorized: false },
      entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
      migrationsRun: false,
      synchronize: false,
      logging: !isProd ? ['error', 'warn'] : ['error'],
      autoLoadEntities: true,
    };
  },
};
