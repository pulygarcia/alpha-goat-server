## 1. ReviewImageUpdater service (TDD)

- [x] 1.1 Write `services/review-image-updater.spec.ts` mocking `ReviewFinder`, `ImageUploader`, `Repository<Review>`: verifies folder/publicId/overwrite, persists `fotoUrl`, 404 when missing, Forbidden for non-author, does not persist when upload fails
- [x] 1.2 Implement `services/review-image-updater.ts` — `execute(id, buffer, userId)`: find, assert `review.userId === userId` (else `ForbiddenException`), upload (`folder: 'reviews'`, `publicId: review.id`), set `fotoUrl`, save

## 2. Controller endpoint

- [x] 2.1 Add `POST /reviews/:id/foto` to `ReviewsController` — `JwtAuthGuard`, `FileInterceptor('file')`, `@UploadedFile(ImageFilePipe)`, `ParseUUIDPipe` on id, `@ApiConsumes`/`@ApiBody`; pass `file.buffer` + `user.id`, map with `ReviewResponseDto.from`
- [x] 2.2 Update `reviews.controller.spec.ts` — new endpoint passes buffer and userId to the service

## 3. Wiring & verification

- [x] 3.1 Import `UploadsModule` and register `ReviewImageUpdater` in `ReviewsModule`
- [x] 3.2 Run `npm run lint` and `npm run test` (coverage ≥ 85%); fix until green
