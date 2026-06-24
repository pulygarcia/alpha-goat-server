## Context

El módulo `users` ya tiene `UserFinder` (por id/email), `UserUpdater`, `UserPasswordChanger` y un `UserResponseDto`. El `GET /users/:id` resuelve por UUID y devuelve el usuario crudo. El módulo `follows` tiene `FollowToggler` con `follow`/`unfollow`/`followingIds`/`followingAmong`, pero **sin conteos**. Las reseñas ya se listan/cuentan por `userId` (`GET /reviews?userId=`). El frontend necesita un único endpoint que junte todo eso para la página `/u/[username]`.

## Goals / Non-Goals

**Goals:**
- Un endpoint `GET /users/by-username/:username` público con auth opcional que devuelva el perfil enriquecido.
- Reusar lo existente (toggler de follows, conteo de reseñas) en vez de duplicar lógica.
- `email` visible solo para el dueño; `isFollowing` correcto para anónimo/tercero/propio.

**Non-Goals:**
- Subida de avatar real (módulo `uploads`/Cloudinary) — queda en backlog.
- Listado de followers/following (solo conteos, no la lista de usuarios).
- Cambiar `GET /users/:id` o cualquier contrato existente.

## Decisions

- **`OptionalJwtAuthGuard`** en la ruta nueva (mismo patrón que `GET /feed` y `GET /reviews`): anónimo la ve, autenticado obtiene `isFollowing`/`email` reales. Reuso del guard existente, no se crea uno nuevo.
- **`UserByUsernameFinder`** (servicio atómico nuevo en `users/services`): busca por `username` y lanza `NotFoundException` si no existe. Mantiene el `UserFinder` por id/email intacto (SRP).
- **`ProfileResponseDto.from(user, extra)`** siguiendo el patrón `ReviewResponseDto.from(entity, extra)`: el controller arma `extra` con `{ followersCount, followingCount, reviewsCount, isFollowing, includeEmail }` y el DTO decide qué exponer. `email` se setea solo si `includeEmail`; `isFollowing` se setea `null` cuando el viewer es el dueño.
- **Conteos en `FollowToggler`**: `countFollowers(userId)` = `count({ where: { followingId: userId } })`; `countFollowing(userId)` = `count({ where: { followerId: userId } })`. Repository API, sin QueryBuilder.
- **`reviewsCount`**: reuso del contador por `userId` ya existente (el mismo que alimenta `GET /reviews?userId=`). `UsersModule` importa lo necesario de `ReviewsModule`/`FollowsModule` (togglers/counters ya exportados).
- **`isFollowing`**: con sesión y perfil ajeno → un único lookup (reuso de `followingAmong(viewerId, [profileId])` o un `exists`); anónimo → `false` sin query; propio perfil → `null` sin query.

## Risks / Trade-offs

- **N consultas por request** (perfil + 3 conteos + isFollowing). Aceptable: son conteos indexados por FK y la página de perfil no es hot-path. Si midiéramos costo, se podría unificar en una query agregada más adelante (no ahora, YAGNI).
- **Username case-sensitive**: el lookup matchea tal cual está guardado. El front linkea con el username exacto del DTO, así que no hay ambigüedad; normalización case-insensitive queda fuera de alcance.
- **Acoplamiento `users` → `follows`/`reviews`**: el perfil necesita esos conteos por diseño. Se resuelve importando los servicios ya exportados, sin romper el aislamiento de módulos.
