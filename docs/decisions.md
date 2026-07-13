# Decisiones

Decisiones de diseño no obvias del backend. Las obvias (qué hace cada service,
estructura de carpetas) viven en `architecture.md` / `progress.md`.

## `uploads` (avatar)

- **Multipart al back, no upload directo a Cloudinary.** El front manda el archivo
  al back (Multer en memoria), que lo streamea a Cloudinary y devuelve la URL. Así
  el secreto de Cloudinary nunca sale del server y la validación (tipo + tamaño)
  queda centralizada en `ImageFilePipe`. Trade-off: el back hace de proxy de bytes;
  aceptable para imágenes ≤5 MB. Si escalara, se migra a signed upload directo.
- **`publicId` determinístico = `user.id` + `overwrite: true`.** Re-subir el avatar
  pisa el asset anterior: cero huérfanos, sin necesidad de persistir el `publicId`
  ni de un paso de borrado. Por eso el avatar no usa `ImageRemover` (existe para
  futuros consumidores con publicId no determinístico).
- **Endpoint `POST /users/me/avatar` en `users`, no en `uploads`.** El avatar es un
  concern del dominio user. `users` consume `ImageUploader` vía el service atómico
  `AvatarUpdater` y el controller queda fino. `uploads` es infra sin entidad ni
  tabla: sólo expone y exporta `ImageUploader` / `ImageRemover`.

## `ranking` (`GET /ranking/worst`)

- **Finder dedicado (`WorstRankedFinder`), no un flag en `GlobalRankingFinder`.**
  Es `GlobalRankingFinder` invertido y sin paginar (una sola fila, `getRawOne`);
  meterle un `order: 'ASC' | 'DESC'` + modo single al finder paginado complicaba
  ambos casos. Mismo piso de 5 reseñas y mismo desempate determinístico, con el
  orden invertido: `score ASC, reviewsCount DESC, id ASC` (entre empatados en el
  fondo, "gana" el que más reseñas acumula).
- **`WorstRankingItemDto` extiende `RankingItemDto` + `imagenUrl`.** El shape es
  espejo del ranking global (así lo consume el front) más la foto del alfajor
  para la card "escándalo" del feed. No se agregó `imagenUrl` al ranking global
  para no engordar un payload paginado que no la usa.
- **204 sin body cuando ningún alfajor califica**, mismo patrón que
  `GET /feed/hero`: la card del front se autooculta en vez de mostrar un "peor"
  con muestra chica.
