# recommendations Specification

## Purpose
TBD - created by archiving change add-recommendations. Update Purpose after archive.
## Requirements
### Requirement: Authenticated recommendations endpoint

The system SHALL expose an authenticated `GET /recommendations` endpoint (`JwtAuthGuard`)
that returns the top alfajores recommended for the current user. Each item SHALL have the
shape `{ id, nombre, tipo, matchPct, score, marca: { id, nombre, logoUrl } }`, ordered by
`score` descending. The list SHALL contain at most N items (default 6). The endpoint SHALL
accept an optional `limit` query param (1..20, default 6).

#### Scenario: Returns the agreed shape

- **WHEN** an authenticated user requests `GET /recommendations`
- **THEN** the response is `200` with a JSON array ordered by `score` descending
- **AND** each item has `id`, `nombre`, `tipo`, `matchPct`, `score` and `marca` with `id`, `nombre`, `logoUrl`

#### Scenario: Requires authentication

- **WHEN** the request carries no valid authentication
- **THEN** the endpoint responds `401` (unlike the public `GET /ranking/weekly`)

#### Scenario: Respects the limit

- **GIVEN** more than 6 eligible alfajores
- **WHEN** the user requests `GET /recommendations?limit=3`
- **THEN** the response contains exactly 3 items

### Requirement: Taste fingerprint is rating-weighted

The system SHALL build the user's taste fingerprint as the per-axis weighted average of the
5 axes (`dulzor`, `cantidadDDL`, `calidadBano`, `ratioTapaRelleno`, `textura`) across the
user's own reviews, weighted by the `ratingGeneral` the user gave each review. Only the
user's reviews of `APPROVED` alfajores SHALL contribute.

#### Scenario: Higher-rated reviews dominate the fingerprint

- **GIVEN** a user who rated alfajor A `ratingGeneral` 9 (axes high on `dulzor`) and alfajor B `ratingGeneral` 2 (axes high on `textura`)
- **WHEN** the fingerprint is built
- **THEN** the fingerprint leans toward A's axis profile (the 9-rated review weighs more than the 2-rated one)

#### Scenario: Reviews of non-approved alfajores are ignored

- **GIVEN** a user whose only high-rated review is of a `PENDING` alfajor
- **WHEN** the fingerprint is built
- **THEN** that review does not contribute to the fingerprint

### Requirement: Candidate eligibility and exclusions

The system SHALL consider as candidates only `APPROVED` alfajores that the user has NOT
reviewed and that have at least the minimum number of reviews (default 3) so their community
axis-profile is trustworthy. A candidate's community profile SHALL be the average of its 5
axes across all its reviews, and its quality SHALL be the average `ratingGeneral` across the
same reviews.

#### Scenario: Already-reviewed alfajores are excluded

- **GIVEN** an alfajor the user has already reviewed
- **WHEN** recommendations are computed
- **THEN** that alfajor does NOT appear in the results

#### Scenario: Alfajor below the minimum sample is excluded

- **GIVEN** an `APPROVED` alfajor with only 2 reviews
- **WHEN** recommendations are computed
- **THEN** that alfajor does NOT appear (its profile is not yet trustworthy)

#### Scenario: Only approved alfajores are candidates

- **GIVEN** a `PENDING` alfajor with many reviews
- **WHEN** recommendations are computed
- **THEN** that alfajor does NOT appear

### Requirement: Match and score computation

The system SHALL compute `matchPct` as the cosine similarity between the user's fingerprint
vector and the candidate's community axis-profile vector, scaled to `0..100` and rounded to
an integer. The system SHALL compute `score` as `0.7 · matchPct + 0.3 · (avgRatingGeneral · 10)`,
rounded to 2 decimals, and SHALL order results by `score` descending. Ties MAY be broken by
`avgRatingGeneral` descending.

#### Scenario: A close taste fit scores high on match

- **GIVEN** a candidate whose axis-profile is proportional to the user's fingerprint
- **WHEN** recommendations are computed
- **THEN** its `matchPct` is at or near 100

#### Scenario: Quality pulls down a perfect-fit but poorly-rated alfajor

- **GIVEN** two candidates with the same `matchPct`, one averaging `ratingGeneral` 9 and the other 4
- **WHEN** recommendations are computed
- **THEN** the 9-rated candidate ranks above the 4-rated one (the quality term breaks the tie)

### Requirement: Cold-start fallback

The system SHALL, when the user has no qualifying reviews (no fingerprint can be built),
return the top alfajores by community `avgRatingGeneral` (applying the same minimum-sample
and `APPROVED` filters and excluding nothing extra), each with `matchPct: null` and
`score` equal to `avgRatingGeneral · 10` rounded to 2 decimals.

#### Scenario: New user gets top-rated alfajores

- **GIVEN** an authenticated user with no reviews
- **WHEN** they request `GET /recommendations`
- **THEN** the response is the top alfajores by average rating, each with `matchPct: null`

### Requirement: Empty and small result sets

The system SHALL return a valid (possibly empty or shorter-than-N) array when few or no
alfajores clear the filters, without error.

#### Scenario: No eligible candidates

- **GIVEN** the user has already reviewed every alfajor that clears the minimum sample
- **WHEN** recommendations are computed
- **THEN** the endpoint responds `200` with an empty array `[]`

#### Scenario: Fewer eligible candidates than N

- **GIVEN** only 2 alfajores clear the filters
- **WHEN** recommendations are computed
- **THEN** the response contains those 2 items (not padded to N)

