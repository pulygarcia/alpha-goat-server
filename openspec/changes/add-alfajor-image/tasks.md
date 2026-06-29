## 1. Extract shared authorization helper

- [x] 1.1 Write `domain/assert-can-edit-alfajor.spec.ts` (admin OK, owner+PENDING OK, owner+APPROVED Forbidden, non-owner Forbidden)
- [x] 1.2 Create `domain/assert-can-edit-alfajor.ts` — pure function `(alfajor, actor: ActorContext)` throwing `ForbiddenException`, moving the logic from `AlfajorUpdater.assertCanEdit`
- [x] 1.3 Refactor `AlfajorUpdater` to use the helper; keep `alfajor-updater.spec.ts` green

## 2. AlfajorImageUpdater service (TDD)

- [x] 2.1 Write `services/alfajor-image-updater.spec.ts` mocking `AlfajorFinder`, `ImageUploader`, `Repository<Alfajor>`: verifies folder/publicId/overwrite, persists URL, 404 when missing, Forbidden for non-owner and owner-approved, OK for admin and owner-pending
- [x] 2.2 Implement `services/alfajor-image-updater.ts` — `execute(id, buffer, actor)`: find, assert via helper, upload (`folder: 'alfajores'`, `publicId: alfajor.id`), set `imagenUrl`, save

## 3. Controller endpoint

- [x] 3.1 Add `POST /alfajores/:id/imagen` to `AlfajoresController` — `JwtAuthGuard`, `FileInterceptor('file')`, `@UploadedFile(ImageFilePipe)`, `ParseUUIDPipe` on id, `@ApiConsumes`/`@ApiBody`; pass `file.buffer` + `{ id, role }`, map with `AlfajorResponseDto.from`
- [x] 3.2 Update `alfajores.controller.spec.ts` — new endpoint passes buffer and actor to the service

## 4. Wiring & verification

- [x] 4.1 Import `UploadsModule` and register `AlfajorImageUpdater` in `AlfajoresModule`
- [x] 4.2 Run `npm run lint` and `npm run test` (coverage ≥ 85%); fix until green
