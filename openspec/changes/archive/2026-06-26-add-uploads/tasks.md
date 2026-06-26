## 1. Config Cloudinary

- [x] 1.1 Agregar dep `cloudinary` (SDK) al proyecto
- [x] 1.2 Sumar `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` a `config/env.validation.ts` (requeridas) y a `.env.example`
- [x] 1.3 Crear `config/cloudinary.config.ts`: provider que configura el SDK desde el `ConfigService`, inyectable y mockeable

## 2. Módulo `uploads` (infra)

- [x] 2.1 `ImageUploader.upload(buffer, { folder, publicId })` → `{ url, publicId }` (overwrite: true; usa `secure_url`) + spec (mock del SDK: verifica params y shape, propaga error del proveedor)
- [x] 2.2 `ImageRemover.remove(publicId)` → destruye el asset + spec (mock del SDK)
- [x] 2.3 `UploadsModule` provee y **exporta** `ImageUploader` (e `ImageRemover`)

## 3. Validación de imagen

- [x] 3.1 Pipe en `common/pipes/` que valida tipo (`image/jpeg`/`png`/`webp`) y tamaño (≤ 5 MB) + spec (tipo inválido → 415, > 5 MB → 400, ausente → 400)

## 4. Avatar (consumidor en `users`)

- [x] 4.1 `AvatarUpdater` (service atómico en `users`): inyecta `ImageUploader`, sube con `folder:'avatars'`, `publicId:user.id`, guarda `avatarUrl`, devuelve el perfil + spec (mockea `ImageUploader`, verifica params y persistencia)
- [x] 4.2 `POST /users/me/avatar` en el controller de `users`: `JwtAuthGuard` + interceptor multipart (`file`) + pipe de validación → `AvatarUpdater` → perfil actualizado; `@ApiConsumes('multipart/form-data')` + Swagger
- [x] 4.3 Wire `UploadsModule` en `UsersModule` (import) y verificar que no introduce ciclos al bootear

## 5. Verificación

- [x] 5.1 `npm run test` (todos verdes, cov ≥ 85% en lo tocado), `npm run lint`, `npm run build`
- [x] 5.2 Actualizar `docs/decisions.md` con las decisiones no obvias (multipart al back, publicId determinístico, endpoint en users)
