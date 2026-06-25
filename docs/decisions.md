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
