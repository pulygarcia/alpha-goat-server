# Progreso

Estado de los módulos del backend. Se actualiza al cerrar cada feature.

## Hecho

### Setup
- NestJS + TypeORM + Postgres + Swagger + ESLint/Prettier configurados.
- `ConfigModule` global con validación de env (`env.validation.ts`).
- `TypeOrmModule` async con SSL para Neon.

### Docs
- `docs/architecture.md` (servicios atómicos, módulos, endpoints, roadmap).
- `docs/data-model.md` (entidades, relaciones, constraints, índices).

### `users`
- Entidad `User` (con `email`/`username` únicos, `role`, `banned`, timestamps).
- DTOs: `UpdateProfileDto`, `ChangePasswordDto`, `UserResponseDto`.
- Services: `UserFinder` (byId / byEmail / byUsername), `UserUpdater`, `UserPasswordChanger`. Todos con `.spec.ts`.
- Controller: `GET /users/:id`, `PATCH /users/me`, `PATCH /users/me/password`.

### `reviews`
- Entidad `Review` con FKs CASCADE (`userId`, `alfajorId`), unique `(userId, alfajorId)`.
- 6 ratings `numeric(3,1)` con transformer string → number en lectura (ratingGeneral + dulzor + cantidadDDL + calidadBano + ratioTapaRelleno + textura).
- DTOs: `CreateReviewDto`, `UpdateReviewDto` (sin `alfajorId`), `SearchReviewsDto`, `ReviewResponseDto`, `PaginatedReviewsDto`.
- Services + specs:
  - `ReviewCreator` — exige `Alfajor` en `APPROVED`, bloquea duplicados.
  - `ReviewFinder`, `ReviewSearcher` (filtros `alfajorId`/`userId`, orden `createdAt DESC`).
  - `ReviewUpdater` — solo el autor edita.
  - `ReviewRemover` — autor o admin.
- Controller `ReviewsController`: `GET /reviews`, `GET /reviews/:id`, `POST /reviews` (auth), `PATCH /reviews/:id` (auth), `DELETE /reviews/:id` (auth, 204).

### `alfajores`
- Entidad `Alfajor` (FKs: `marcaId` RESTRICT, `createdById` SET NULL; unique `(nombre, marcaId)`).
- Enums: `AlfajorStatus` (PENDING/APPROVED/REJECTED), `AlfajorTipo` (CHOCOLATE/BLANCO/NEGRO/FRUTAL/MAICENA/OTRO).
- DTOs: `CreateAlfajorDto`, `UpdateAlfajorDto` (sin `marcaId`), `SearchAlfajoresDto`, `AlfajorResponseDto`, `PaginatedAlfajoresDto`.
- Services + specs:
  - `AlfajorCreator` — crea como `PENDING`, valida marca y unicidad `(nombre, marcaId)`.
  - `AlfajorFinder` — byId con 404.
  - `AlfajorSearcher` — paginado + filtros (`q`, `marcaId`, `tipo`); fuerza `APPROVED` salvo `includeAllStatuses` (admin).
  - `AlfajorUpdater` — admin edita siempre; creador solo mientras `PENDING`.
- Controller `AlfajoresController` con `GET /alfajores`, `GET /alfajores/:id`, `POST /alfajores` (auth), `PATCH /alfajores/:id` (auth, dueño-pending o admin).
- `MarcaFinder` se reutiliza desde `MarcasModule` (export ya estaba listo).

### `marcas`
- Entidad `Marca` (nombre único, provincia, descripción, logoUrl, timestamps).
- DTOs: `CreateMarcaDto`, `UpdateMarcaDto`, `SearchMarcasDto`, `MarcaResponseDto`, `PaginatedMarcasDto`.
- Services: `MarcaCreator`, `MarcaFinder`, `MarcaSearcher` (paginado + filtro `q` con ILIKE), `MarcaUpdater`. Todos con `.spec.ts`.
- Controllers:
  - Público: `GET /marcas`, `GET /marcas/:id`.
  - Admin (`@Roles(ADMIN)` + `RolesGuard`): `POST /admin/marcas`, `PATCH /admin/marcas/:id`.
- Sin `MarcaRemover` por ahora (FK con `RESTRICT` desde `Alfajor`).

### `comments`
- Entidades `Comment` (FK CASCADE a Review y User) y `CommentLike` (FK CASCADE a Comment y User, unique `(commentId, userId)`).
- DTOs: `CreateCommentDto` (contenido 1-1000 chars), `UpdateCommentDto`, `SearchCommentsDto` (page/limit), `CommentResponseDto`, `PaginatedCommentsDto`.
- Services + specs:
  - `CommentCreator` — valida que la Review exista via `ReviewFinder`.
  - `CommentFinder` — byId con 404.
  - `CommentSearcher` — paginado scoped al `reviewId`, orden `createdAt ASC`.
  - `CommentUpdater` — solo el autor edita.
  - `CommentRemover` — autor o admin.
  - `CommentLikeToggler` — `like` idempotente, `unlike` con `delete`.
- Controller `CommentsController`:
  - `GET /reviews/:reviewId/comments`, `GET /comments/:id`.
  - `POST /reviews/:reviewId/comments` (auth).
  - `PATCH /comments/:id` (auth), `DELETE /comments/:id` (auth, 204).
  - `PUT /comments/:id/like` (auth, 204), `DELETE /comments/:id/like` (auth, 204).

### `auth`
- DTOs: `RegisterDto`, `LoginDto`, `AuthResponseDto`.
- Services: `PasswordHasher` (bcrypt), `JwtTokenSigner`, `UserRegistrar`, `UserAuthenticator`. Todos con `.spec.ts`.
- `JwtStrategy` (passport-jwt) + `JwtAuthGuard`.
- `RolesGuard` + decorator `@Roles()` con su spec.
- `@CurrentUser()` decorator.
- Controller: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.

### Testing
- Jest configurado con `coverageThreshold: 85%` (branches, functions, lines, statements).
- `collectCoverageFrom` excluye `*.module.ts`, `*.dto.ts`, `*.entity.ts`, `*.enum.ts`, `main.ts`.

## Pendiente

### Próximos módulos
- `review-likes` (ReviewLike: like/unlike a una review, unique por user).
- `uploads` (Cloudinary) — avatar, foto de alfajor, foto de review.
- `moderation` (admin): approve / reject alfajores pendientes.

### Deuda técnica conocida
- **Migrations**: aún no se generó la migration inicial para `users`. `synchronize: false`, así que para correr la app contra Neon hay que generar/correr la primera migration con la CLI de TypeORM.
- **Naming strategy**: `data-model.md` mencionaba `snake_case` en DB; las entidades quedan en `camelCase` (default de TypeORM). Si se quiere `snake_case`, agregar `typeorm-naming-strategies` y `namingStrategy: new SnakeNamingStrategy()` en `typeorm.config.ts`.
- **HttpExceptionFilter global**: `architecture.md` lo menciona; todavía no se creó. Por ahora valen los filtros default de Nest.
- **Seed de admin**: falta script para crear el primer ADMIN.
