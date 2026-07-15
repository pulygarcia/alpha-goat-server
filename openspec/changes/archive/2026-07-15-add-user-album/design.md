# add-user-album — design

## Module and route

New module `src/modules/album/` (controller + dto/ + `services/album-finder.ts`). The
route lives under the `users` path (`@Controller('users')`, `@Get('by-username/:username/album')`)
but in its own module: the capability aggregates reviews + alfajores + marcas and would
bloat `users`. `UsersModule` already exports `UserFinder`; `AlbumFinder` resolves the
owner via `UserFinder.byUsernameOrFail` (404 built in). No route conflict with
`GET /users/:id` (`ParseUUIDPipe`) — the `by-username/...` literal segment wins.

## Queries: 2 bounded reads + merge in TS

QueryBuilder is justified only where aggregation forces it (same precedent as
`ranking`/`feed`):

1. **Catalog with avgRating** — one QB over `alfajores` (`status = APPROVED`) LEFT JOIN
   `reviews`, `AVG(r.ratingGeneral)` + `GROUP BY a.id`, selecting the sticker fields plus
   `marcaId`. LEFT JOIN (not INNER) so review-less alfajores appear with `avgRating: null`.
2. **Owner's reviews** — repo API: `reviews.find({ where: { userId }, select: [id, alfajorId, ratingGeneral] })`.
3. **Marcas of the catalog** — repo API: `marcas.find({ where: { id: In(marcaIds) } })`.

Merge in TS: group rows by marca, sort hojas by `nombre` (localeCompare), sort stickers by
`avgRating` desc nulls-last + `nombre` asc, overlay the owner's reviews for
`collected`/`myRating`/`reviewId`, compute per-hoja and global stats. All ordering and
rounding rules live in TS where they are unit-testable (same rationale as
`WeeklyRankingFinder.trendOf`).

No pagination: the album is consumed whole and the catalog is small; revisit only if the
catalog grows by orders of magnitude.

## Rounding

`AVG` on `numeric` comes back as string from pg → `Number(x.toFixed(2))` like `round2` in
ranking. `pct` likewise 2 decimals, `0` when `total = 0`.

## Mapping

Response DTOs (`AlbumResponseDto`, `AlbumHojaDto`, `AlbumStickerDto`, `AlbumStatsDto`)
with `@ApiProperty`; the finder returns the assembled structure and the controller maps
via a static `from(...)`, consistent with the rest of the codebase.

## Testing

Finder spec mocks the three repositories (QB chain mock for the aggregation, plain mocks
for the repo-API reads) and covers every spec scenario: shape, hoja ordering, sticker
ordering with nulls-last, collected overlay, visitor irrelevance (finder only ever
receives the owner id), stats math, empty catalog, unknown username (finder propagates
`UserFinder`'s 404). Controller spec: thin forward + DTO mapping.
