## Why

Alfajores have an `imagenUrl` field but no way to populate it: the only path
today is passing a raw URL through `PATCH /alfajores/:id`, with no upload. The
`uploads` module (Cloudinary `ImageUploader`) already powers user avatars; the
alfajor photo is its next consumer so the catalog can show real images.

## What Changes

- New endpoint `POST /alfajores/:id/imagen` in the **alfajores** module: JWT,
  `multipart/form-data` field `file`, validated by the existing `ImageFilePipe`
  (jpeg/png/webp, ≤5 MB). Returns the updated `AlfajorResponseDto`.
- New atomic service `AlfajorImageUpdater`: uploads the buffer via `ImageUploader`
  (`folder: 'alfajores'`, `publicId: alfajor.id`, overwrite) and persists the
  returned URL on `alfajor.imagenUrl`.
- Authorization mirrors editing an alfajor: **admin always; the creator only
  while the alfajor is `PENDING`**. The current `assertCanEdit` rule (private in
  `AlfajorUpdater`) is extracted to a shared pure helper so both services reuse
  it without duplication.
- `AlfajoresModule` imports `UploadsModule` and registers `AlfajorImageUpdater`.
- **Additive** to the frontend contract: a new endpoint; `AlfajorResponseDto`
  already exposes `imagenUrl`, so no response-shape change. No DB migration —
  `imagenUrl` already exists on the entity.

## Capabilities

### New Capabilities
- `alfajor-image`: uploading and replacing an alfajor's photo via Cloudinary,
  including who may upload and the deterministic-overwrite storage behavior.

### Modified Capabilities
<!-- None: image-uploads infra is unchanged; this only consumes it. -->

## Impact

- Code: `src/modules/alfajores/` (new controller endpoint, new service +
  spec, extracted auth helper + spec, module wiring, controller spec).
- APIs: adds `POST /alfajores/:id/imagen` (additive, JWT). No existing contract
  changes.
- Dependencies: reuses `UploadsModule` / `ImageUploader` and the shared
  `ImageFilePipe`. No new packages, no migration.
