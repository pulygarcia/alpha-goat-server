## Why

Reviews have a `fotoUrl` field but no way to populate it. The product goal is to
let reviewers show the **real alfajor outside its package**, so potential buyers
aren't disappointed by the difference from the marketing photo. The `uploads`
module (Cloudinary `ImageUploader`) already powers avatars and alfajor images;
the review photo is its next consumer.

## What Changes

- New endpoint `POST /reviews/:id/foto` in the **reviews** module: JWT,
  `multipart/form-data` field `file`, validated by the existing `ImageFilePipe`
  (jpeg/png/webp, ≤5 MB). Returns the updated `ReviewResponseDto`.
- New atomic service `ReviewImageUpdater`: uploads the buffer via `ImageUploader`
  (`folder: 'reviews'`, `publicId: review.id`, overwrite) and persists the
  returned URL on `review.fotoUrl`.
- Authorization mirrors editing a review: **only the author** may upload. Any
  other user is rejected with 403 Forbidden. The rule stays inline in the service
  (a single `review.userId !== userId` check), matching `ReviewUpdater`.
- `ReviewsModule` imports `UploadsModule` and registers `ReviewImageUpdater`.
- **Additive** to the frontend contract: a new endpoint; `ReviewResponseDto`
  already exposes `fotoUrl`, so no response-shape change. No DB migration —
  `fotoUrl` already exists on the entity.

## Capabilities

### New Capabilities
- `review-image`: uploading and replacing a review's photo via Cloudinary,
  including who may upload and the deterministic-overwrite storage behavior.

### Modified Capabilities
<!-- None: image-uploads infra is unchanged; this only consumes it. -->

## Impact

- Code: `src/modules/reviews/` (new controller endpoint, new service + spec,
  module wiring, controller spec).
- APIs: adds `POST /reviews/:id/foto` (additive, JWT). No existing contract
  changes.
- Dependencies: reuses `UploadsModule` / `ImageUploader` and the shared
  `ImageFilePipe`. No new packages, no migration.
- Bandwidth optimization (Cloudinary `f_auto`/`q_auto` + sizing) is delivery-side
  and handled on the frontend; out of scope here.
