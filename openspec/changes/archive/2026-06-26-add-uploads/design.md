## Context

El módulo `uploads` existe scaffolded (solo `.gitkeep` en `dto/` y `services/`). La entidad `User` ya tiene `avatarUrl: varchar(500) nullable`, hoy siempre null → el front muestra placeholder cream. El stack ya designa Cloudinary como storage de imágenes (ver `AGENTS.md`). Este cambio construye la infra y conecta el primer consumidor (avatar).

## Goals / Non-Goals

**Goals:**
- Módulo `uploads` reutilizable con `ImageUploader` (y `ImageRemover` para futuro) que encapsula el SDK de Cloudinary.
- Validación de imagen (tipo + tamaño) centralizada y reutilizable.
- Endpoint `POST /users/me/avatar` que sube y persiste la URL en `avatarUrl`.
- TDD con mock del SDK de Cloudinary (sin tocar la red ni la DB en unit tests).

**Non-Goals:**
- Foto de alfajor / foto de review (mismos servicios, tareas posteriores).
- Quitar avatar (sin `DELETE`).
- Transformaciones/optimización server-side; cola de procesamiento.

## Decisions

- **Multipart al back (Multer en memoria).** El front manda el archivo al back, que lo streamea a Cloudinary y devuelve la URL. Mantiene el secreto de Cloudinary en el server y centraliza validación. Memory storage porque el buffer solo se reenvía a Cloudinary; nada toca disco.
- **`uploads` sin entidad ni tabla.** Es infra: expone servicios atómicos (`ImageUploader.upload`, `ImageRemover.remove`) y `UploadsModule` los exporta. La DB solo guarda URLs en los módulos consumidores.
- **`publicId` determinístico = `user.id` + `overwrite: true`** para el avatar. Re-subir pisa el asset, cero huérfanos, sin necesidad de persistir el `publicId` ni un paso de borrado.
- **Endpoint en `users`, no en `uploads`.** El avatar es un concern del dominio user. `users` consume `ImageUploader` vía `AvatarUpdater` (servicio atómico) y el controller queda fino.
- **Config Cloudinary como provider** inicializado desde `config/cloudinary.config.ts` con envs validadas en `env.validation.ts`. El SDK se mockea en tests inyectándolo.
- **Validación vía pipe** en `common/pipes/` (tipos `jpeg/png/webp`, máx 5 MB) — reutilizable por los futuros consumidores.

## Risks / Trade-offs

- **Carga en el server**: el back actúa de proxy de bytes. Aceptable para imágenes ≤5 MB y el volumen esperado; si escalara, se migra a signed upload directo (descartado por ahora por simplicidad/confianza).
- **Acoplamiento al SDK de Cloudinary**: contenido detrás de `ImageUploader`, así que un cambio de proveedor toca un solo servicio.
- **Envs nuevas obligatorias**: sin `CLOUDINARY_*` el módulo no bootea — se documenta en `.env.example` y se valida en `env.validation.ts` para fallar temprano y claro.
