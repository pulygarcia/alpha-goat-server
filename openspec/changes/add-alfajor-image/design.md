## Context

The `uploads` module already exposes `ImageUploader.upload(buffer, { folder, publicId })`
→ `{ url, publicId }` and the shared `ImageFilePipe` (jpeg/png/webp, ≤5 MB). The
user-avatar feature consumes it via `AvatarUpdater` + `POST /users/me/avatar`.
The alfajor photo is the next consumer. The `Alfajor` entity already has a
nullable `imagenUrl` column, and `AlfajorResponseDto` already exposes it, so no
schema or response-shape change is needed.

Alfajores have an edit-permission rule today, implemented as the private
`assertCanEdit` method inside `AlfajorUpdater`: admin always; the creator only
while the alfajor is `PENDING`. The image upload must obey the same rule.

## Goals / Non-Goals

**Goals:**
- Add `POST /alfajores/:id/imagen` mirroring the avatar upload pattern.
- Persist a Cloudinary URL on `alfajor.imagenUrl` with no orphaned assets.
- Reuse the existing edit-authorization rule without duplicating it.

**Non-Goals:**
- No image removal endpoint (consumer can re-upload to overwrite).
- No DB migration, no `image-uploads` infra change.
- No frontend work (separate board task).

## Decisions

**Atomic service `AlfajorImageUpdater`.** Mirrors `AvatarUpdater`: injects
`Repository<Alfajor>`, `AlfajorFinder`, `ImageUploader`. `execute(id, buffer,
actor)` finds the alfajor (404 via finder), asserts authorization, uploads, sets
`imagenUrl`, saves. One responsibility, fully mockable. _Alternative — extend
`AlfajorUpdater` to accept a buffer:_ rejected, it would mix multipart upload
concerns into the JSON-patch updater and break the one-thing-per-service rule.

**Deterministic `publicId = alfajor.id` + overwrite.** Same as avatars:
re-uploading overwrites the same Cloudinary asset, so we never accumulate
orphans and don't need to store a separate `publicId`. `folder: 'alfajores'`.

**Extract the authorization rule to a shared pure helper.** Move the
`assertCanEdit(alfajor, actor)` logic out of `AlfajorUpdater` into
`domain/assert-can-edit-alfajor.ts` (a pure function throwing
`ForbiddenException`). Both `AlfajorUpdater` and `AlfajorImageUpdater` import it.
_Alternative — have `AlfajorImageUpdater` call `AlfajorUpdater`:_ rejected,
couples two atomic services and drags JSON-patch semantics into an upload.
_Alternative — duplicate the check:_ rejected, two copies drift.

**Endpoint naming `:id/imagen`.** Spanish, consistent with the `imagenUrl`
field and the domain vocabulary already used across the module.

**Thin controller.** `POST /alfajores/:id/imagen` uses `JwtAuthGuard`,
`FileInterceptor('file')`, `@UploadedFile(ImageFilePipe)`, `ParseUUIDPipe` on the
id, and `@ApiConsumes('multipart/form-data')` + `@ApiBody` for Swagger — exactly
like `uploadAvatar`. Passes `file.buffer` and `{ id, role }` to the service and
maps the result with `AlfajorResponseDto.from`.

## Risks / Trade-offs

- [Extracting `assertCanEdit` could subtly change `AlfajorUpdater` behavior] →
  The helper is a pure move (same logic); `alfajor-updater.spec` stays green and
  the helper gets its own spec covering admin / owner-pending / owner-approved /
  non-owner.
- [An APPROVED alfajor's photo can only be changed by an admin] → Intended:
  matches the catalog moderation model; creators edit only while PENDING.
