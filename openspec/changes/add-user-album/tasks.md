# add-user-album — tasks

## 1. Module scaffold

- [x] 1.1 Create `src/modules/album/` with `album.module.ts` (imports
      `TypeOrmModule.forFeature([Alfajor, Review, Marca])` + `UsersModule` for
      `UserFinder`) and register `AlbumModule` in `app.module.ts`

## 2. Finder

- [x] 2.1 Implement `services/album-finder.ts`: resolve owner via
      `UserFinder.byUsernameOrFail`; aggregation QB (APPROVED catalog + AVG ratingGeneral,
      LEFT JOIN); repo-API reads for the owner's reviews and the marcas; merge in TS
      (hojas alphabetical, stickers by avgRating desc nulls-last + nombre asc, collected
      overlay, per-hoja and global stats with round2)
- [x] 2.2 Write `services/album-finder.spec.ts` covering every spec scenario: shape, 404
      propagation, hoja ordering, marca without approved alfajores excluded, sticker
      ordering with nulls last, collected/myRating/reviewId overlay, stats math, empty
      catalog

## 3. Endpoint

- [x] 3.1 Create `dto/` (`AlbumResponseDto`, `AlbumHojaDto`, `AlbumStickerDto`,
      `AlbumStatsDto`, owner DTO) with `@ApiProperty` and static `from(...)`
- [x] 3.2 Create `album.controller.ts`: public `GET /users/by-username/:username/album`,
      thin handler calling the finder, Swagger decorators (200/404), + controller spec

## 4. Wrap-up

- [x] 4.1 Run `npm run lint`, `npm run build`, `npm run test:cov` (>= 85%) and fix anything
      that fails
- [ ] 4.2 Update `docs/progress.md` (back), `alphagoat-client/docs/progress.md` ("listo en
      back, falta conectar en FE") and the Obsidian board

