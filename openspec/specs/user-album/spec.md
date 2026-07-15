# user-album Specification

## Purpose
The public sticker-album view of a user's alfajor-tasting history: every `APPROVED`
alfajor grouped into one page (hoja) per marca, with a sticker marked `collected` when the
album's owner has reviewed it (reviewing = sticking; there is no separate collect action),
plus completion stats per hoja and global.
## Requirements
### Requirement: Public album endpoint by username

The system SHALL expose a public `GET /users/by-username/:username/album` endpoint (no
auth) that returns the full album of the user with that username in a single response,
with the shape `{ owner, stats, hojas }`. `owner` SHALL be `{ id, username, avatarUrl }`.
The endpoint SHALL respond `404` when no user has that username.

#### Scenario: Returns the agreed shape

- **WHEN** anyone requests `GET /users/by-username/:username/album` for an existing user
- **THEN** the response is `200` with `owner { id, username, avatarUrl }`, global `stats { collected, total, pct }` and `hojas[]`

#### Scenario: Unknown username

- **WHEN** the request targets a username that does not exist
- **THEN** the endpoint responds `404`

#### Scenario: Anonymous access

- **WHEN** the request carries no authentication
- **THEN** the endpoint responds `200` (the album is public and read-only for visitors)

### Requirement: One hoja per marca with APPROVED alfajores

The system SHALL build one hoja per marca that has at least one `APPROVED` alfajor, and no
hoja for marcas without `APPROVED` alfajores. Hojas SHALL be ordered alphabetically by
marca `nombre` and each SHALL carry `marca { id, nombre, logoUrl, provincia }`. Alfajores
in `PENDING` or `REJECTED` status SHALL NOT appear anywhere in the album.

#### Scenario: Marca without approved alfajores has no hoja

- **GIVEN** a marca whose only alfajores are `PENDING`
- **WHEN** the album is built
- **THEN** that marca does not appear in `hojas`

#### Scenario: Hojas are ordered alphabetically

- **GIVEN** marcas "Havanna" and "Cachafaz" with approved alfajores
- **WHEN** the album is built
- **THEN** the "Cachafaz" hoja comes before the "Havanna" hoja

### Requirement: Stickers ordered by community rating

Within each hoja, the system SHALL order stickers by community `avgRating` (average
`ratingGeneral` across all reviews of that alfajor) descending, with alfajores without
reviews (`avgRating: null`) last, and `nombre` ascending as tie-break. Each sticker SHALL
have the shape `{ id, nombre, tipo, imagenUrl, avgRating, collected, myRating, reviewId }`
with `avgRating` rounded to 2 decimals.

#### Scenario: Best-rated stickers come first

- **GIVEN** a hoja whose alfajores average 4.5, 2.0 and one has no reviews
- **WHEN** the album is built
- **THEN** the stickers appear in that order, the review-less one last with `avgRating: null`

### Requirement: Collected semantics from the owner's reviews

The system SHALL mark a sticker `collected: true` if and only if the album's **owner** has
a review of that alfajor, exposing the owner's `ratingGeneral` as `myRating` and the
review's id as `reviewId`. Uncollected stickers SHALL have `collected: false` and
`myRating: null`, `reviewId: null`. Reviews of other users (including an authenticated
visitor) SHALL NOT affect the flags.

#### Scenario: Owner's review collects the sticker

- **GIVEN** the owner reviewed an alfajor with `ratingGeneral` 4
- **WHEN** the album is built
- **THEN** that sticker has `collected: true`, `myRating: 4` and its `reviewId`

#### Scenario: A visitor's own reviews do not matter

- **GIVEN** a visitor who reviewed an alfajor the owner did not
- **WHEN** the visitor requests the owner's album
- **THEN** that sticker has `collected: false`

### Requirement: Completion stats

The system SHALL include completion stats both per hoja and global, each as
`{ collected, total, pct }` where `pct = collected / total · 100` rounded to 2 decimals
(`0` when `total` is 0). Global `total` SHALL equal the number of `APPROVED` alfajores.

#### Scenario: Per-hoja and global stats add up

- **GIVEN** 23 approved alfajores of which the owner reviewed 9
- **WHEN** the album is built
- **THEN** global stats are `{ collected: 9, total: 23, pct: 39.13 }` and each hoja's stats count only its own alfajores

### Requirement: Empty catalog

The system SHALL return a valid album with `hojas: []` and `stats { collected: 0, total: 0, pct: 0 }`
when there are no `APPROVED` alfajores, without error.

#### Scenario: No approved alfajores

- **GIVEN** an empty catalog
- **WHEN** anyone requests an existing user's album
- **THEN** the response is `200` with empty `hojas` and zeroed stats
