# Backend Architecture - Alfajorímetro

Este documento describe la arquitectura del backend en detalle. Léelo completo antes de crear o modificar módulos.

## Filosofía: arquitectura orientada a servicios atómicos

En lugar de un service grande tipo `AlfajoresService` con métodos `create`, `findAll`, `findOne`, `update`, `remove`, separamos cada acción en su propia clase. Cada clase tiene **una única responsabilidad** y un único método público (típicamente `execute`).

**Ventajas:**
- Cada clase es chica, fácil de leer y testear.
- Single Responsibility Principle (SRP) en serio, no en charla.
- Inyectás solo lo que necesitás. Un controller que solo busca alfajores no carga la dependencia para crearlos.
- Los tests son focales: testeás un comportamiento por archivo.
- Refactorizar es trivial: si cambia la lógica de "crear", solo tocás `AlfajorCreator`.

**Desventaja honesta:**
- Más archivos. Pero a cambio cada uno es mínimo.

## Tipos de servicios atómicos

| Sufijo       | Responsabilidad                                        | Ejemplo                          |
|--------------|--------------------------------------------------------|----------------------------------|
| `Creator`    | Crear una entidad nueva                                | `AlfajorCreator`                 |
| `Finder`     | Buscar **una** entidad por id u otro criterio único    | `AlfajorFinder`                  |
| `Searcher`   | Buscar **muchas** entidades con filtros/paginación     | `AlfajorSearcher`                |
| `Updater`    | Actualizar campos de una entidad                       | `AlfajorUpdater`                 |
| `Remover`    | Borrar (hard o soft delete)                            | `AlfajorRemover`                 |
| `Approver`   | Cambiar estado a aprobado (caso específico)            | `AlfajorApprover`                |
| `Rejecter`   | Cambiar estado a rechazado                             | `AlfajorRejecter`                |
| `Counter`    | Contar entidades                                       | `ReviewCounter`                  |
| `Calculator` | Calcular valores derivados (promedios, rankings)       | `AlfajorRatingCalculator`        |

Si una acción no encaja en ninguno, inventá un sufijo descriptivo. Ej: `PasswordHasher`, `JwtSigner`, `RadarChartBuilder`.

## Estructura de un módulo

Cada módulo de feature (ej: `alfajores`) tiene esta estructura:

```
modules/alfajores/
├── alfajores.module.ts                   # registro del módulo
├── alfajores.controller.ts               # endpoints públicos
├── admin-alfajores.controller.ts         # endpoints solo admin (si aplica)
├── domain/
│   ├── alfajor.entity.ts                 # entidad TypeORM
│   ├── alfajor-status.enum.ts
│   └── alfajor-tipo.enum.ts
├── dto/
│   ├── create-alfajor.dto.ts
│   ├── update-alfajor.dto.ts
│   ├── search-alfajores.dto.ts           # query params para listados
│   ├── alfajor-response.dto.ts           # lo que devuelve la API
│   └── reject-alfajor.dto.ts
├── services/
│   ├── alfajor-creator.ts
│   ├── alfajor-creator.spec.ts
│   ├── alfajor-finder.ts
│   ├── alfajor-finder.spec.ts
│   ├── alfajor-searcher.ts
│   ├── alfajor-searcher.spec.ts
│   ├── alfajor-updater.ts
│   ├── alfajor-updater.spec.ts
│   ├── alfajor-approver.ts
│   ├── alfajor-approver.spec.ts
│   ├── alfajor-rejecter.ts
│   └── alfajor-rejecter.spec.ts
└── repositories/
    └── alfajor.repository.ts             # opcional, si hay queries custom
```

## Ejemplo completo: AlfajorCreator

### Service

```typescript
// modules/alfajores/services/alfajor-creator.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';
import { CreateAlfajorDto } from '../dto/create-alfajor.dto';

@Injectable()
export class AlfajorCreator {
  constructor(
    @InjectRepository(Alfajor)
    private readonly alfajoresRepo: Repository<Alfajor>,
  ) {}

  async execute(dto: CreateAlfajorDto, createdById: string): Promise<Alfajor> {
    const exists = await this.alfajoresRepo.findOne({
      where: { nombre: dto.nombre, marcaId: dto.marcaId },
    });

    if (exists) {
      throw new ConflictException(
        `Ya existe un alfajor "${dto.nombre}" para esa marca`,
      );
    }

    const alfajor = this.alfajoresRepo.create({
      ...dto,
      status: AlfajorStatus.PENDING,
      createdById,
    });

    return this.alfajoresRepo.save(alfajor);
  }
}
```

### Test

```typescript
// modules/alfajores/services/alfajor-creator.spec.ts
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlfajorCreator } from './alfajor-creator';
import { Alfajor } from '../domain/alfajor.entity';
import { AlfajorStatus } from '../domain/alfajor-status.enum';

describe('AlfajorCreator', () => {
  let creator: AlfajorCreator;
  let repo: jest.Mocked<Repository<Alfajor>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlfajorCreator,
        {
          provide: getRepositoryToken(Alfajor),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    creator = module.get(AlfajorCreator);
    repo = module.get(getRepositoryToken(Alfajor));
  });

  it('should create a PENDING alfajor when no duplicate exists', async () => {
    repo.findOne.mockResolvedValue(null);
    const created = { id: '1', nombre: 'Jorgito', status: AlfajorStatus.PENDING } as Alfajor;
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue(created);

    const result = await creator.execute(
      { nombre: 'Jorgito', marcaId: 'marca-1', tipo: 'CHOCOLATE' } as any,
      'user-1',
    );

    expect(result.status).toBe(AlfajorStatus.PENDING);
    expect(repo.save).toHaveBeenCalled();
  });

  it('should throw ConflictException when duplicate exists', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing' } as Alfajor);

    await expect(
      creator.execute(
        { nombre: 'Jorgito', marcaId: 'marca-1', tipo: 'CHOCOLATE' } as any,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });
});
```

### Controller

```typescript
// modules/alfajores/alfajores.controller.ts
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AlfajorCreator } from './services/alfajor-creator';
import { AlfajorFinder } from './services/alfajor-finder';
import { AlfajorSearcher } from './services/alfajor-searcher';
import { CreateAlfajorDto } from './dto/create-alfajor.dto';
import { SearchAlfajoresDto } from './dto/search-alfajores.dto';

@ApiTags('alfajores')
@Controller('alfajores')
export class AlfajoresController {
  constructor(
    private readonly creator: AlfajorCreator,
    private readonly finder: AlfajorFinder,
    private readonly searcher: AlfajorSearcher,
  ) {}

  @Get()
  search(@Query() dto: SearchAlfajoresDto) {
    return this.searcher.execute(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.finder.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateAlfajorDto, @CurrentUser('id') userId: string) {
    return this.creator.execute(dto, userId);
  }
}
```

## Módulos del proyecto

### `auth`
Login, registro, generación y validación de JWT. Servicios:
- `UserRegistrar`: registra usuario nuevo (hashea password, valida email único).
- `UserAuthenticator`: valida credenciales y retorna usuario.
- `JwtTokenSigner`: genera el access token.
- `PasswordHasher`: bcrypt wrapper.
- `JwtAuthGuard`: protege rutas que requieren auth.
- `RolesGuard`: valida rol (USER/ADMIN). Va junto con `@Roles('ADMIN')` decorator.

### `users`
- `UserFinder`: busca por id o por email.
- `UserUpdater`: actualiza perfil (no password, eso va aparte).
- `UserPasswordChanger`: cambia password.
- `UserAvatarUpdater`: sube avatar a Cloudinary y guarda URL.

### `alfajores`
- `AlfajorCreator`: crea con status `PENDING`.
- `AlfajorFinder`: busca uno por id (lanza `NotFoundException`).
- `AlfajorSearcher`: lista con filtros (marca, tipo, status, search) y paginación.
- `AlfajorUpdater`: edita (solo admin o el creador si está pendiente).
- `AlfajorRatingCalculator`: calcula promedios de rating y de los 5 ejes.

### `marcas`
- `MarcaCreator`, `MarcaFinder`, `MarcaSearcher`, `MarcaUpdater`.

### `reviews`
- `ReviewCreator`: crea review (1 por usuario por alfajor, falla si ya existe).
- `ReviewFinder`: busca por id.
- `ReviewSearcher`: lista por alfajor o por usuario, con paginación.
- `ReviewUpdater`: edita propia review.
- `ReviewRemover`: borra propia review (o cualquier admin).

### `comments`
- `CommentCreator`, `CommentFinder`, `CommentSearcher`, `CommentUpdater`, `CommentRemover`: comentarios planos sobre una review.
- `CommentLikeToggler`: like/unlike de un comentario (idempotente).

### `review-likes` (dentro de `reviews`)
- `ReviewLikeToggler`: like/unlike de una review. `like` idempotente, `unlike` con delete. Endpoints `PUT/DELETE /reviews/:id/like`.

### `follows`
- `FollowToggler`: `follow` (idempotente, rechaza auto-follow con 400, valida que el target exista), `unfollow`, y `followingIds(userId)` que consume el feed. Endpoints `PUT/DELETE /follows/:userId`. Exporta `FollowToggler`.

### `feed`
- `FeedHeroFinder`: pick editorial (alfajor destacado + stats semanales) para `GET /feed/hero` (público).
- `FeedFinder`: lista paginada de reseñas para `GET /feed` (auth). Dos pasos (ids ordenados+conteos por QueryBuilder; entidades por `find`) para esquivar un bug de TypeORM al ordenar por alias calculado con joins+limit.

### `moderation` (admin only)
- `AlfajorApprover`: cambia status `PENDING` → `APPROVED` y limpia `rejectionReason`. Si el alfajor no está en `PENDING`, devuelve `BadRequest`.
- `AlfajorRejecter`: cambia status `PENDING` → `REJECTED` y guarda `rejectionReason`. Mismas restricciones que el approver.
- Para listar pendientes se reutiliza `AlfajorSearcher` (de `AlfajoresModule`) pasándole `status: PENDING` + `includeAllStatuses: true`. No se creó un `PendingAlfajoresSearcher` dedicado.

### `uploads`
- `CloudinaryUploader`: recibe un buffer/file, sube a Cloudinary, devuelve URL pública.
- `CloudinaryRemover`: borra una imagen por public_id.

## Endpoints (resumen)

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /users/:id
PATCH  /users/me
PATCH  /users/me/password
POST   /users/me/avatar

GET    /alfajores                        # solo APPROVED por default
GET    /alfajores/:id
POST   /alfajores                        # cualquier user, queda PENDING

GET    /marcas
POST   /marcas                           # admin

GET    /alfajores/:id/reviews
POST   /alfajores/:id/reviews            # auth
PATCH  /reviews/:id                      # owner
DELETE /reviews/:id                      # owner o admin
PUT    /reviews/:id/like                 # auth
DELETE /reviews/:id/like                 # auth

GET    /reviews/:id/comments
POST   /reviews/:id/comments             # auth
PATCH  /comments/:id                     # owner
DELETE /comments/:id                     # owner o admin
PUT    /comments/:id/like                # auth
DELETE /comments/:id/like                # auth

PUT    /follows/:userId                  # auth
DELETE /follows/:userId                  # auth

GET    /feed/hero                        # público (204 si no hay reviews)
GET    /feed                             # auth — scope + sort + page/limit

GET    /admin/alfajores/pending          # admin
PATCH  /admin/alfajores/:id/approve      # admin
PATCH  /admin/alfajores/:id/reject       # admin

# --- Pedidos por el front (alphagoat-client) ---
GET    /feed/stats                       # público — { todayCount, weekCount } para el subnav  [HECHO]
GET    /ranking/weekly                   # rail: top N semana con score, trend, marca
GET    /marcas/featured                  # rail: marcas en foco con productCount y avgScore
GET    /recommendations                  # auth — recomendaciones (matchPct, score)
```

## Modelo de datos

Detalle completo (todas las tablas, constraints e índices) en [`docs/data-model.md`](data-model.md). Resumen:

- **User**: id, email, username, passwordHash, avatar, role (USER/ADMIN), banned, createdAt
- **Marca**: id, nombre, provincia, descripcion, logo
- **Alfajor**: id, nombre, marcaId, tipo, descripcion, imagen, status, rejectionReason, createdById, createdAt
- **Review**: id, userId, alfajorId, ratingGeneral (0.0-10.0), dulzor (0.0-10.0), cantidadDDL (0.0-10.0), calidadBano (0.0-10.0), ratioTapaRelleno (0.0-10.0), textura (0.0-10.0), comentario, fotoUrl, createdAt
- **Comment**: id, reviewId, userId, contenido, createdAt
- **ReviewLike / CommentLike**: id, (reviewId|commentId), userId, createdAt — unique por par
- **UserFollow**: id, followerId, followingId, createdAt — unique por par, relación dirigida

Constraint clave: **unique(userId, alfajorId)** en Review (1 review por usuario por alfajor).
Constraint clave: **unique(nombre, marcaId)** en Alfajor (sin duplicados exactos).

## Configuración global (main.ts)

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));

app.useGlobalFilters(new HttpExceptionFilter());

app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});

const config = new DocumentBuilder()
  .setTitle('Alfajorímetro API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
```

## Variables de entorno

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database (Neon)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# JWT
JWT_SECRET=<openssl rand -base64 32>
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Testing - estrategia para llegar al 85%

1. **Cada service atómico tiene su `.spec.ts`**. Eso solo te da el grueso del coverage.
2. **Tests por comportamiento**: feliz path, errores esperados (404, 409, 400), edge cases.
3. **Mock todo lo externo**: repositorios, Cloudinary, JwtService.
4. **No testear DTOs vacíos** (no aporta nada). Sí testear validaciones complejas custom.
5. **Configuración de coverage en `jest.config.js`**:

```javascript
coverageThreshold: {
  global: {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
},
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.module.ts',
  '!src/**/*.dto.ts',
  '!src/**/*.entity.ts',
  '!src/main.ts',
  '!src/**/index.ts',
],
```

Excluimos módulos, DTOs y entities porque son declarativos (no tienen lógica para testear).

## Roadmap (fases)

### Fase 1 - MVP
1. Setup (NestJS + TypeORM + Postgres + Swagger + ESLint).
2. Módulo `auth` completo con tests.
3. Módulo `users` (find, update profile).
4. Módulo `marcas` (CRUD básico).
5. Módulo `alfajores` (sin moderación, todo va aprobado).
6. Módulo `reviews` (create, list, update, delete).
7. Módulo `uploads` (Cloudinary).

### Fase 2 - Modelo híbrido + admin
8. Estados PENDING/APPROVED/REJECTED en Alfajor.
9. Módulo `moderation` con guards de admin.
10. `AlfajorRatingCalculator` para promedios y radar charts.

### Fase 3 - Features destacadas
11. Endpoints de ranking y comparador.
12. Sistema de recomendaciones (alfajores similares por ejes).
13. Endpoint de "paladar promedio" del usuario.

## Reglas que Claude Code debe seguir

1. **Antes de crear un módulo nuevo**, leer este archivo y `progress.md`.
2. **Cada service atómico va en su propio archivo** con su `.spec.ts` al lado.
3. **Nunca lógica de negocio en controllers**. Si pasa, es un bug de arquitectura.
4. **Nunca exponer entidades directamente**: siempre mappear a un Response DTO.
5. **Tests en la misma sesión** que el código, nunca después.
6. **Después de terminar un módulo**, actualizar `progress.md`.
7. Si algo no encaja en esta arquitectura, **detenerse y preguntar** antes de inventar.
