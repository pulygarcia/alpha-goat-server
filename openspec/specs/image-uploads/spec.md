# image-uploads Specification

## Purpose
TBD - created by archiving change add-uploads. Update Purpose after archive.
## Requirements
### Requirement: Subir imagen a Cloudinary
El sistema SHALL exponer un servicio `ImageUploader` que recibe el buffer de una imagen y la sube a Cloudinary, devolviendo `{ url, publicId }`. El back actúa como intermediario (memory storage → buffer → Cloudinary); el secreto de Cloudinary nunca se expone al cliente.

#### Scenario: Subida exitosa
- **WHEN** se llama a `upload(buffer, { folder, publicId })` con un buffer válido
- **THEN** la imagen se sube a Cloudinary bajo el `folder` y `publicId` dados con `overwrite: true`
- **AND** el servicio devuelve `{ url, publicId }` con la URL pública (`secure_url`) del asset

#### Scenario: Falla del proveedor
- **WHEN** Cloudinary devuelve un error durante la subida
- **THEN** el servicio propaga el error para que el caller lo maneje (no devuelve una URL inválida)

### Requirement: Eliminar imagen de Cloudinary
El sistema SHALL exponer un servicio `ImageRemover` que borra un asset de Cloudinary por su `publicId`. (Para consumidores futuros; el avatar usa `overwrite` y no lo requiere.)

#### Scenario: Borrado por publicId
- **WHEN** se llama a `remove(publicId)`
- **THEN** se solicita a Cloudinary la destrucción del asset con ese `publicId`

### Requirement: Validación de imagen subida
El sistema SHALL validar, mediante un pipe reutilizable, que el archivo recibido sea una imagen permitida antes de subirla.

#### Scenario: Tipo no permitido
- **WHEN** el archivo tiene un mime type distinto de `image/jpeg`, `image/png` o `image/webp`
- **THEN** el sistema responde `415 Unsupported Media Type` y no sube nada

#### Scenario: Archivo demasiado grande
- **WHEN** el archivo supera los 5 MB
- **THEN** el sistema responde `400 Bad Request` y no sube nada

#### Scenario: Archivo ausente
- **WHEN** la request no incluye el campo de archivo esperado
- **THEN** el sistema responde `400 Bad Request`

