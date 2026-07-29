import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // FRONTEND_URL admite varios origenes separados por coma: en prod conviven
  // el dominio de produccion del front y los previews de Vercel.
  const origin = (config.get<string>('FRONTEND_URL') ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  app.enableCors({ origin, credentials: true });

  setupSwagger(app);

  const port = Number(config.get<string>('PORT') ?? 3001);
  await app.listen(port);

  Logger.log(`App running on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger docs on http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
