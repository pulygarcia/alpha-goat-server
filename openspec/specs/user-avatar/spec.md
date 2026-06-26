# user-avatar Specification

## Purpose
TBD - created by archiving change add-uploads. Update Purpose after archive.
## Requirements
### Requirement: Subir/reemplazar avatar del usuario autenticado
El sistema SHALL exponer `POST /users/me/avatar` (protegido por `JwtAuthGuard`, multipart campo `file`) que sube la imagen a Cloudinary y persiste su URL pública en `user.avatarUrl`, devolviendo el perfil actualizado. Re-subir reemplaza el avatar anterior.

#### Scenario: Subida de avatar exitosa
- **GIVEN** un usuario autenticado
- **WHEN** envía `POST /users/me/avatar` con un archivo de imagen válido en `file`
- **THEN** la imagen se sube con `folder: 'avatars'`, `publicId: <user.id>` y `overwrite: true`
- **AND** `user.avatarUrl` queda con la URL pública devuelta por Cloudinary
- **AND** la respuesta incluye el perfil con el nuevo `avatarUrl`

#### Scenario: Reemplazo de avatar existente
- **GIVEN** un usuario que ya tiene avatar
- **WHEN** sube una nueva imagen
- **THEN** como el `publicId` es determinístico (`user.id`) con `overwrite: true`, el asset anterior se pisa sin dejar huérfanos
- **AND** `user.avatarUrl` apunta a la nueva imagen

#### Scenario: Sin autenticación
- **WHEN** se llama a `POST /users/me/avatar` sin sesión válida
- **THEN** el sistema responde `401 Unauthorized` y no sube nada

#### Scenario: Archivo inválido
- **WHEN** el usuario autenticado envía un archivo de tipo no permitido o mayor a 5 MB
- **THEN** el sistema rechaza la request (`415` o `400`) y `user.avatarUrl` no cambia

