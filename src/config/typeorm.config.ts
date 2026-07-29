import { ConfigService } from '@nestjs/config';
import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { join } from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
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
      migrations: [
        join(__dirname, '..', 'database', 'migrations', '*.{ts,js}'),
      ],
      // En prod las migraciones corren al arrancar, desde los `.js` de `dist`:
      // el `migration:run` del package.json usa ts-node, que es devDependency
      // y no existe en el server. En local se corren a mano.
      migrationsRun: isProd,
      synchronize: false,
      logging: !isProd ? ['error', 'warn'] : ['error'],
      autoLoadEntities: true,
      namingStrategy: new SnakeNamingStrategy(),
    };
  },
};
