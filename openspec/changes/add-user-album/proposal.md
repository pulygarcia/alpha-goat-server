# add-user-album

## Why

The "Completá tu álbum de alfajores" feature (backlog, decided 2026-07-06) needs a backend
endpoint. The album is a World Cup sticker-album-style view: one page (hoja) per marca, a
sticker per alfajor; a sticker is "collected" when the album's owner has reviewed that
alfajor (reviewing = sticking — there is no separate collect action). The album is public
and viewable on any user's profile (`/u/[username]/album`), read-only for visitors. The
cross-join (catalog × owner's reviews × avg ratings) must be built in the backend so every
client gets it precomputed.

## What Changes

- New module `src/modules/album/` (the capability aggregates across users, alfajores,
  marcas and reviews, like `feed` and `ranking`; it is not CRUD on a single entity).
- New **public** endpoint `GET /users/by-username/:username/album` returning the full
  album in one response (no pagination — the catalog is small and the album is consumed
  whole):
  - `owner`: `{ id, username, avatarUrl }` (the album's owner, resolved by username; 404
    if it does not exist).
  - `stats`: global completion `{ collected, total, pct }`.
  - `hojas[]`: one per marca that has at least one `APPROVED` alfajor, ordered
    alphabetically by marca `nombre`. Each hoja has `marca { id, nombre, logoUrl,
    provincia }`, its own `stats`, and its `alfajores[]` ordered by community `avgRating`
    descending (the "cracks" at the top, per the backlog decision).
  - Each sticker: `{ id, nombre, tipo, imagenUrl, avgRating, collected, myRating,
    reviewId }` where `collected`/`myRating`/`reviewId` come from the **owner's** review
    (not the visitor's). The grayscale→color effect for uncollected stickers is pure
    frontend.
- Additive only: no existing endpoint or response shape changes. **No breaking changes.**

## Capabilities

### New Capabilities

- `user-album`: the album endpoint — page grouping, ordering, collected semantics,
  completion stats, and the response shape.

### Modified Capabilities

(none — no existing spec's requirements change)

## Impact

- New code only: `src/modules/album/` (controller, module, dto/, `AlbumFinder` service).
- `app.module.ts` registers the new module. Reuses `UserFinder.byUsername` from
  `UsersModule`.
- Reads `users`, `reviews`, `alfajores`, `marcas` tables; no schema changes, no migrations.
- Frontend contract: consumed by the album page at `/u/[username]/album`
  (alphagoat-client). Update its `docs/progress.md` when done.

## Non-goals

- Achievements/badges for completing a hoja — retention hook noted in the backlog, but a
  later change.
- Any write operation: there is no "collect" action; reviewing is the only way to fill the
  album.
- Per-visitor data (e.g. the visitor's own ratings overlaid on someone else's album).
- Pagination or partial loading of the album.
- Grouping strategies other than by marca (flat grid, by tipo) — the response shape keeps
  marca embedded per hoja, so the frontend could flatten it client-side if the design ever
  changes.
