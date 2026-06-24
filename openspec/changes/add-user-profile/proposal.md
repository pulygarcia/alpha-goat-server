## Why

El frontend va a construir la página de perfil público (`/u/[username]`), pero hoy el back no expone un perfil consultable por username ni los datos sociales que la página necesita (conteos de seguidores/seguidos, total de reseñas, y si el visitante sigue a ese usuario). El `GET /users/:id` actual solo resuelve por UUID y devuelve el usuario crudo, sin esos agregados.

## What Changes

- **Nuevo endpoint** `GET /users/by-username/:username` (público, **auth opcional**) que resuelve un perfil por su username único y devuelve un `ProfileResponseDto` enriquecido.
- **Nuevo `ProfileResponseDto`**: campos públicos del usuario (`id`, `username`, `avatarUrl`, `role`, `createdAt`) + agregados sociales `followersCount`, `followingCount`, `reviewsCount` + `isFollowing`.
  - `email` se incluye **solo** cuando el perfil consultado es el del propio usuario autenticado; para terceros y anónimos va omitido.
  - `isFollowing`: `true`/`false` según la sesión vs ese perfil; `false` para anónimos; `null` cuando es el propio perfil (no aplica seguirse a uno mismo).
- **Nuevo servicio** `UserByUsernameFinder` (lanza `NotFoundException` si no existe).
- **Nuevos métodos de conteo** en `FollowToggler`: `countFollowers(userId)` y `countFollowing(userId)`.
- Reuso del conteo de reseñas existente para `reviewsCount` (filtro por `userId`, ya soportado por `GET /reviews?userId=`).
- Cambio **aditivo**: no se toca `GET /users/:id` ni ningún contrato existente. Sin breaking changes.

## Capabilities

### New Capabilities
- `user-profile`: perfil público consultable por username con datos sociales agregados (conteos + isFollowing) y email visible solo para el dueño.

### Modified Capabilities
<!-- ninguna: el cambio es aditivo, no altera requisitos de specs existentes -->

## Impact

- **Módulo** `users` (existente): nuevo controller route, `ProfileResponseDto`, `UserByUsernameFinder`.
- **Módulo** `follows` (existente): dos métodos de conteo nuevos en `FollowToggler`; `UsersModule` deberá importar `FollowsModule` (o el toggler exportado) para los conteos. Reuso del conteo de reseñas por `userId`.
- **Contrato consumido por el frontend**: sí — nuevo endpoint que alimenta la página `/u/[username]` de alphagoat-client. Cambio puramente aditivo.
- **DB**: sin migraciones (solo lecturas/conteos sobre tablas existentes `user_follow`, `review`).
