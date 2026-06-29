## Context

The `uploads` module exposes `ImageUploader.upload(buffer, { folder, publicId })`
→ `{ url, publicId }` and the shared `ImageFilePipe` (jpeg/png/webp, ≤5 MB). It
already backs avatars (`AvatarUpdater`) and alfajor images (`AlfajorImageUpdater`).
The review photo is the next consumer. The `Review` entity already has a nullable
`fotoUrl` column, and `ReviewResponseDto` already exposes it, so no schema or
response-shape change is needed.

Editing a review today is author-only: `ReviewUpdater` throws `ForbiddenException`
when `review.userId !== userId` (no admin override). The image upload obeys the
same rule.

## Goals / Non-Goals

**Goals:**
- Add `POST /reviews/:id/foto` mirroring the alfajor/avatar upload pattern.
- Persist a Cloudinary URL on `review.fotoUrl` with no orphaned assets.
- Restrict uploads to the review's author.

**Non-Goals:**
- No image removal endpoint (re-upload overwrites; deleting the review removes it).
- No DB migration, no `image-uploads` infra change.
- No admin override (admins moderate by deleting the whole review).
- No frontend work, including the Cloudinary bandwidth delivery optimization.

## Decisions

**Atomic service `ReviewImageUpdater`.** Mirrors `AlfajorImageUpdater`: injects
`Repository<Review>`, `ReviewFinder`, `ImageUploader`. `execute(id, buffer,
userId)` finds the review (404 via finder), asserts authorship, uploads, sets
`fotoUrl`, saves. One responsibility, fully mockable. _Alternative — extend
`ReviewUpdater` to accept a buffer:_ rejected, it would mix multipart upload
concerns into the JSON-patch updater.

**Deterministic `publicId = review.id` + overwrite.** Same as avatars/alfajores:
re-uploading overwrites the same Cloudinary asset, so we never accumulate orphans
and don't store a separate `publicId`. `folder: 'reviews'`.

**Authorization inline, not extracted.** The rule is a single comparison
(`review.userId !== userId`), identical to `ReviewUpdater`. Unlike the alfajor
case (a non-trivial admin+status rule duplicated across services), extracting a
helper here would add indirection for a one-liner. Keep it inline; extract only
if a third consumer appears. _Alternative — `assert-is-review-author` helper:_
deferred (YAGNI).

**Endpoint naming `:id/foto`.** Spanish, consistent with the `fotoUrl` field.

**Thin controller.** `POST /reviews/:id/foto` uses `JwtAuthGuard`,
`FileInterceptor('file')`, `@UploadedFile(ImageFilePipe)`, `ParseUUIDPipe` on the
id, and `@ApiConsumes('multipart/form-data')` + `@ApiBody` for Swagger — like
`uploadAvatar`/`uploadImage`. Passes `file.buffer` and `user.id` to the service
and maps the result with `ReviewResponseDto.from`.

## Risks / Trade-offs

- [Inline auth could drift from `ReviewUpdater`'s rule] → Both are a single
  `userId` comparison covered by tests; if a third consumer appears, extract a
  shared helper then.
- [Unbounded asset growth: one photo per review scales with reviews] → Bounded
  per review by `publicId = review.id` + overwrite (no duplicates per review);
  storage is not the binding Cloudinary constraint, bandwidth is, and that is
  mitigated on the delivery side (frontend).
