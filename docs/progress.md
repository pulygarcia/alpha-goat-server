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
- Services: `UserFinder` (byId / byEmail / byUsername), `UserUpdater`, `UserPasswordChanger`, `AvatarUpdater`. Todos con `.spec.ts`.
- Controller: `GET /users/:id`, `PATCH /users/me`, `PATCH /users/me/password`, `POST /users/me/avatar`.

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

### Database / infra
- **Conexión a Neon** funcionando. `DATABASE_PASSWORD` aislado en env y `DATABASE_URL` lo interpola con `${DATABASE_PASSWORD}` (`expandVariables: true` en `ConfigModule`).
- **`SnakeNamingStrategy`** aplicado en `typeorm.config.ts` y en el `DataSource` standalone. Entidades alineadas: `@JoinColumn({ name: 'xxx_id' })` consistente con las columnas `xxxId` transformadas.
- **`DataSource` standalone** en `src/database/data-source.ts` para la CLI de TypeORM. Carga `.env` con `dotenv-expand`.
- Scripts npm: `typeorm`, `migration:generate`, `migration:run`, `migration:revert`.
- **Migration inicial** (`Init...`) generada y corrida contra Neon — 6 tablas creadas con FKs e índices, todo en snake_case.

### `moderation`
- Services + specs:
  - `AlfajorApprover` — `PENDING` → `APPROVED`, limpia `rejectionReason`. `BadRequest` si el alfajor no está en `PENDING`.
  - `AlfajorRejecter` — `PENDING` → `REJECTED` con `rejectionReason` obligatorio (1-500 chars).
- DTO: `RejectAlfajorDto`.
- Controller `ModerationController` (`@Roles(ADMIN)` + `RolesGuard`):
  - `GET /admin/alfajores/pending` — reutiliza `AlfajorSearcher` con `status: PENDING` + `includeAllStatuses: true` (no se creó un searcher dedicado).
  - `PATCH /admin/alfajores/:id/approve`.
  - `PATCH /admin/alfajores/:id/reject`.
- Endpoints documentados con `@ApiOperation` y `@ApiResponse` (200/400/401/403/404).

### Seeds
- `seed:admin` — idempotente, crea/promueve usuario ADMIN desde `ADMIN_EMAIL/USERNAME/PASSWORD` (env vars opcionales en validación).
- `seed:marcas` — 12 marcas argentinas (Havanna, Cachafaz, Jorgito, Guaymallén, Capitán del Espacio, Balcarce, Fantoche, Águila, Milka, Cofler, Tofi, Terrabusi).
- `seed:alfajores` — 23 alfajores APPROVED vinculados a las marcas.
- `seed:reviews` — 5 demo users (`demo.*@alfajorimetro.test`, password `Demo1234!`) + ~54 reseñas distribuidas en los últimos 14 días sobre los alfajores APPROVED + likes deterministas por reseña (0..5 likers) para que `GET /feed?sort=likes` tenga orden real. PRNG determinista; idempotente respetando `UNIQUE(userId, alfajorId)` y `UNIQUE(reviewId, userId)` de likes.
- Coverage excluye `database/**`.

### `feed`
- Endpoint `GET /feed/hero` (público): pick editorial del feed.
  - `FeedHeroFinder`: top 1 alfajor APPROVED por #reviews en los últimos 7 días, desempate por avg `ratingGeneral`. Fallback all-time si la ventana semanal está vacía. Devuelve `null` (→ 204 en el controller) si no hay reseñas en la DB.
  - Response: `{ alfajor + marca, ratings (6 ejes promedio histórico), stats { reviewsThisWeek, reviewsLastWeek, deltaPct, totalReviews }, period }`. `deltaPct = null` cuando `reviewsLastWeek = 0`.
  - QueryBuilder para agregaciones (`COUNT`, `AVG`, `GROUP BY`); `findOne({ relations })` ORM puro para cargar el alfajor con marca.
  - Tests: 5 verdes (empty, fallback all-time, deltaPct, alfajor inexistente, ventana de 7 días).
- Endpoint `GET /feed` (auth, `JwtAuthGuard`): lista paginada de reseñas del feed.
  - Query: `scope=today|week|following|province` (opcional), `sort=likes|recent|rating` (default `recent`), `province` (requerido si `scope=province`, sino 400), `page`/`limit` (default 1/20, max 50). Paginación `page/limit` consistente con el resto del back (no cursor).
  - Response `{ items, total, page, limit }`. Cada item: `author {id, username, avatarUrl, isFollowing}`, `alfajor {id, nombre, tipo, imagenUrl}`, `marca {id, nombre, provincia}`, `quote` (comentario), `photoUrl`, `overall` (ratingGeneral), `axes (5 ejes)`, `likes`, `commentsCount`, `createdAt`. Sin `sharesCount` (no habrá compartir). Solo reseñas de alfajores APPROVED.
  - `author.isFollowing`: si el usuario autenticado sigue al autor. Se resuelve acotado a los autores de la página vía `FollowToggler.followingAmong(userId, authorIds)` (no trae todos los seguidos). `false` para reseñas propias (uno no se sigue a sí mismo). Lo consume el `FollowButton` del front (change `wire-follows`).
  - `FeedFinder` en dos pasos para esquivar un bug de TypeORM (hidratar entidades + order by alias calculado + limit genera SQL inválido): (1) QueryBuilder plano que trae ids ordenados/paginados + conteos de likes/comments por subquery correlacionada; (2) `find({ where: { id: In(ids) }, relations })` repo-API puro y reordenado según el rank. `scope=following` usa `FollowToggler.followingIds`; si no sigue a nadie → feed vacío sin pegarle a la DB.
  - Tests: 11 verdes (9 finder: province sin valor, following vacío, total 0, mapeo de conteos, reorden por rank, filtro following, order by likes, offset/limit, isFollowing por autor; 2 controller: mapeo del item dto, forward de query+userId).
  - Verificado con smoke test real contra Neon: sort recent/rating/likes, scope week/province/following, like/unlike y follow/unfollow end-to-end, 400 de province/auto-follow.
- Endpoint `GET /feed/stats` (público): conteos para el subnav del feed.
  - `FeedStatsFinder`: devuelve `{ todayCount, weekCount }`. Las ventanas espejan las de `FeedFinder` (hoy = desde las 00:00 del día local; semana = ventana móvil de 7 días) para que los contadores coincidan con lo que listan `scope=today` / `scope=week`. Solo cuenta reseñas de alfajores APPROVED. `now` inyectable para testear sin tocar el reloj.
  - Response DTO `FeedStatsDto`. Público (como `/feed/hero`): son conteos globales sin datos del usuario.
  - Tests: 4 finder (counts, ventana hoy, ventana semana, filtro APPROVED) + 1 controller. Todo verde.
- Bootstrap loguea `App running on http://localhost:<port>` + `Swagger docs on http://localhost:<port>/docs`.

### `review-likes`
- Entidad `ReviewLike` (FKs CASCADE a Review y User, unique `(reviewId, userId)`, índice en `reviewId`).
- `ReviewLikeToggler` — `like` idempotente (chequea existencia antes de insertar), `unlike` con `delete`. Patrón espejado de `CommentLikeToggler`.
- Endpoints en `ReviewsController`: `PUT /reviews/:id/like` (auth, 204) y `DELETE /reviews/:id/like` (auth, 204).
- Migration `AddReviewLikes1779736666318` corrida en Neon — crea tabla `review_likes` con su unique + FKs CASCADE.
- Tests: 3 verdes (create, idempotente, delete).

### `ranking`
- `GET /ranking/weekly` (público) — top 5 alfajores de la semana para el rail del feed. `WeeklyRankingFinder`: una sola query de agregación sobre las reviews de los últimos 14 días (sólo alfajores APPROVED) con `AVG ... FILTER` por ventana — `score` = promedio de `ratingGeneral` de los últimos 7 días (2 decimales), `prevScore` = el de la semana anterior — piso de 3 reseñas en la semana actual (`HAVING COUNT FILTER`), orden DESC, top 5. Hidratación con `relations: ['marca']` preservando el orden, como `MarcaFeaturedFinder`. `trend` (`up`/`down`/`same`/`new`) se decide en TS comparando los promedios ya redondeados; `new` si no hubo reviews la semana anterior (la ventana previa no exige piso). Response `{ id, nombre, score, trend, marca: { id, nombre, logoUrl } }`; el delta crudo no se expone. Tests: 15 verdes (finder 100%). OpenSpec change `add-ranking-weekly`.

### `recommendations`
- `GET /recommendations` (auth) — "recomendado para vos" para el rail del feed. Content-based sobre los 5 ejes. `UserTasteFingerprint` arma la huella del usuario: promedio de los ejes de sus reviews (sólo alfajores APPROVED) ponderado por el `ratingGeneral` que puso (sus notas propias, su gusto); devuelve `null` si no tiene reviews (cold start). `RecommendationFinder`: una query de agregación (QB) arma el perfil comunitario (`AVG` de los 5 ejes + `AVG ratingGeneral`) de cada alfajor APPROVED que el user NO reseñó (`NOT IN` subquery de sus reviews) con piso de 3 reseñas (`HAVING COUNT >= 3`); en TS calcula `matchPct` = coseno(huella, perfil)·100 y `score` = `0.7·matchPct + 0.3·(avgGeneral·10)` (2 decimales), ordena por score desc (desempate por calidad), top N (default 6, `limit` 1..20). Cold start → ordena por calidad con `matchPct: null`. Hidratación con `relations: ['marca']` preservando orden. Response `{ id, nombre, tipo, matchPct, score, marca: { id, nombre, logoUrl } }`. Tests: 15 verdes (fingerprint + finder, services 98.86%). OpenSpec change `add-recommendations`.

### `follows`
- Entidad `UserFollow` (relación dirigida `followerId → followingId`, unique `(followerId, followingId)`, índices en ambas FKs, CASCADE a User). No es simétrica: seguir de vuelta requiere otra fila con roles invertidos.
- `FollowToggler` — `follow` idempotente (valida que el target exista vía `UserFinder` y rechaza seguirse a uno mismo con 400), `unfollow` con `delete`, y `followingIds(userId)` que devuelve los ids seguidos (lo consume el feed para `scope=following`).
- Endpoints en `FollowsController`: `PUT /follows/:userId` (auth, 204) y `DELETE /follows/:userId` (auth, 204). El follower sale del JWT, el target de la URL.
- Migration `AddUserFollows1779914186581` corrida en Neon — tabla `user_follows` con unique + 2 índices + 2 FKs CASCADE.
- Tests: 7 verdes (follow create/idempotente/self-reject, unfollow, followingIds, controller follow/unfollow).

### `uploads`
- Infra de imágenes sobre Cloudinary. Sin entidad ni tabla: `UploadsModule` provee y exporta los services atómicos.
- `config/cloudinary.config.ts`: `cloudinaryProvider` (token `CLOUDINARY`) configura el SDK desde `ConfigService` y se inyecta/mockea en tests. Envs `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` validadas (obligatorias) en `env.validation.ts` + `.env.example`.
- `ImageUploader.upload(buffer, { folder, publicId })` → `{ url, publicId }` vía `upload_stream` (memory storage → buffer → Cloudinary), `overwrite: true`, usa `secure_url`.
- `ImageRemover.remove(publicId)` — `destroy` del asset (para consumidores futuros con publicId no determinístico).
- `ImageFilePipe` en `common/pipes/`: valida tipo (`jpeg`/`png`/`webp` → 415) y tamaño (≤5 MB → 400, ausente → 400). Reutilizable.
- **Avatar** (consumidor en `users`): `AvatarUpdater` sube con `folder:'avatars'`, `publicId:user.id`, persiste `avatarUrl`. Endpoint `POST /users/me/avatar` (`JwtAuthGuard` + `FileInterceptor('file')` + `ImageFilePipe`, `@ApiConsumes('multipart/form-data')`). `publicId` determinístico + overwrite → re-subir pisa el avatar sin huérfanos.
- Tests: 20 verdes (uploader, remover, pipe, avatar-updater, controller). Decisiones no obvias en `docs/decisions.md`. OpenSpec change `add-uploads`.

### `album`
- `GET /users/by-username/:username/album` (público, 404 si el username no existe) — álbum de figuritas del usuario: todo el catálogo APPROVED en hojas por marca; figurita `collected` = el **dueño** del álbum la reseñó (reseñar = pegar, no hay acción de coleccionar; las reviews del visitante no influyen).
- `AlbumFinder`: dueño vía `UserFinder.byUsernameOrFail` (export ya existente de `UsersModule`); catálogo con `avgRating` por subquery correlacionada (`AVG(rating_general)`, alias `avgrating` todo minúsculas — lección PR #24) para conservar alfajores sin reviews (`avgRating: null`); reviews del dueño y marcas por repo-API acotado; merge en TS (orden y stats testeables). Sin paginación: el álbum se consume entero y el catálogo es chico.
- Orden: hojas alfabéticas por marca (`localeCompare('es')`); dentro de cada hoja `avgRating` desc con nulls al final y `nombre` asc de desempate. Stats `{ collected, total, pct }` por hoja y globales, `pct` 2 decimales (0 si total 0).
- Response `{ owner {id, username, avatarUrl}, stats, hojas: [{ marca {id, nombre, logoUrl, provincia}, stats, alfajores: [{ id, nombre, tipo, imagenUrl, avgRating, collected, myRating, reviewId }] }] }`. `myRating` = ratingGeneral del dueño; `reviewId` para linkear a la reseña.
- Tests: 11 verdes (10 finder + 1 controller), módulo 100% líneas. OpenSpec change `add-user-album`.

## Pendiente

### Próximos módulos
- `uploads` (Cloudinary) — **avatar listo** (ver abajo). Falta foto de alfajor y foto de review (mismos services, tareas posteriores).

### Endpoints pedidos por el front (`alphagoat-client`)
Definidos en `alphagoat-client/docs/progress.md` → "Endpoints backend faltantes". No estaban en el roadmap original de `architecture.md`; surgieron al construir el feed. Se implementan **en el orden en que los va necesitando el front**. Contrato esperado por el front:

- ~~`GET /feed/stats`~~ — **listo** (público, `{ todayCount, weekCount }`). Ver entrada en `feed` arriba. Conectado en el FE (subnav del feed vía `useFeedStats`).
- ~~`GET /ranking/weekly`~~ — **listo** (público). Ver entrada en `ranking` arriba. Falta conectar en el FE.
- ~~`GET /marcas/featured`~~ — **listo** (público). "Marcas en foco" del rail por **controversia**: `MarcaFeaturedFinder` rankea las marcas por dispersión (`STDDEV_SAMP`) del `ratingGeneral` en una ventana de 30 días (sólo reviews de alfajores APPROVED), con piso de 5 reseñas para que el desvío no sea ruido, orden DESC, top 5. Dos pasos (agregación QB para rankear + repo-API para hidratar las marcas) como `feed-finder`. Response `{ id, nombre, provincia, logoUrl, productCount, avgScore }` (productCount/avgScore históricos); la controversia es interna, no se expone. Ruta declarada antes de `:id`. Tests: 11 verdes (finder + controller). Falta conectar en el FE. OpenSpec change `add-marcas-featured`.
- ~~`GET /recommendations`~~ — **listo** (auth). Ver entrada en `recommendations` arriba. Falta conectar en el FE.

Flujo de trabajo acordado: al cerrar cada endpoint en el back, actualizar `alphagoat-client/docs/progress.md` marcándolo como "listo en back, falta conectar en FE".

### Deuda técnica conocida
- (sin items abiertos)
