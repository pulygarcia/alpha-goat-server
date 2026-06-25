## Why

El perfil (y a futuro alfajores y reseñas) muestra un placeholder cream porque no hay forma de subir imágenes: el módulo `uploads` está scaffolded pero vacío. Necesitamos la infra de subida a Cloudinary para conectar su primer consumidor, el avatar real del perfil.

## What Changes

- **Nuevo módulo `uploads`** (infra reutilizable, sin entidad ni tabla): wrapper del SDK de Cloudinary expuesto como servicio atómico `ImageUploader` (`upload(buffer, { folder, publicId })` → `{ url, publicId }`), más `ImageRemover.remove(publicId)` para consumidores futuros. `UploadsModule` exporta `ImageUploader`.
- **Config Cloudinary** en `config/cloudinary.config.ts` + envs `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` validados en `env.validation.ts`.
- **Pipe de validación de imagen** en `common/pipes/`: acepta `image/jpeg`, `image/png`, `image/webp`; rechaza > 5 MB.
- **Nuevo endpoint en `users` (consumidor)**: `POST /users/me/avatar` (JWT, multipart campo `file`) → sube con `folder: 'avatars'`, `publicId: user.id`, `overwrite: true` → guarda la URL en `user.avatarUrl` (columna ya existente) → devuelve el perfil actualizado. Cambio **aditivo**, no rompe contratos existentes.

## Capabilities

### New Capabilities
- `image-uploads`: subida de imágenes a Cloudinary vía multipart al back (memory storage → buffer → Cloudinary → URL pública), con validación de tipo/tamaño. El back es intermediario; la DB solo guarda URLs.
- `user-avatar`: subir/reemplazar el avatar del usuario autenticado (`POST /users/me/avatar`), persistiendo la URL en `avatarUrl`.

### Modified Capabilities
<!-- Ninguna: no cambian requerimientos de specs existentes; el endpoint de avatar es nuevo y aditivo. -->

## Impact

- **Módulos**: nuevo `src/modules/uploads/` (infra); `src/modules/users/` gana endpoint + `AvatarUpdater`.
- **Config**: `config/cloudinary.config.ts`, `env.validation.ts` (3 envs nuevas); `common/pipes/` (pipe de imagen).
- **Dependencias**: `cloudinary` SDK; soporte multipart de NestJS (Multer en memoria).
- **Frontend**: habilita el input de avatar en `EditProfileModal` (tarea aparte del sprint). El endpoint es aditivo: nada existente se rompe.

## Non-goals

- Foto de alfajor y foto de review (consumidores siguientes del mismo módulo, tareas posteriores del sprint).
- Quitar avatar / volver al placeholder (no se incluye un `DELETE`).
- Cola de procesamiento / transformaciones server-side más allá de lo que Cloudinary aplique por defecto.
