# ranking-weekly

Selecting and returning the weekly top alfajores for the feed rail, ranked by the average
rating of the current 7-day window, with a trend direction vs the previous window.

## ADDED Requirements

### Requirement: Weekly ranking endpoint

The system SHALL expose a public `GET /ranking/weekly` endpoint (no authentication) that
returns the top alfajores of the current ranking window for the feed rail. Each item SHALL
have the shape `{ id, nombre, score, trend, marca: { id, nombre, logoUrl } }`, ordered by
`score` descending. The list SHALL contain at most N items (default 5). The raw delta value
between windows SHALL NOT be exposed — only the `trend` direction.

#### Scenario: Returns the agreed shape

- **WHEN** an anonymous client requests `GET /ranking/weekly`
- **THEN** the response is `200` with a JSON array ordered by `score` descending
- **AND** each item has `id`, `nombre`, `score`, `trend` and `marca` with `id`, `nombre`, `logoUrl`
- **AND** no raw delta or per-window review-count field is present

#### Scenario: Public access

- **WHEN** the request carries no authentication
- **THEN** the endpoint still responds `200` (it is public, like `GET /marcas/featured`)

### Requirement: Score is the windowed average rating

The system SHALL compute each alfajor's `score` as the average `ratingGeneral` of its
reviews created within the current 7-day rolling window (from `now - 7 days` to `now`),
rounded to 2 decimals. Only `APPROVED` alfajores SHALL be eligible; reviews of `PENDING`
or `REJECTED` alfajores SHALL be ignored.

#### Scenario: Score reflects only the current window

- **GIVEN** an alfajor with old reviews averaging 9.5 and current-window reviews averaging 6.0
- **WHEN** the weekly ranking is computed
- **THEN** its `score` is 6.0 (old reviews do not count)

#### Scenario: Only approved alfajores rank

- **GIVEN** a `PENDING` alfajor with high-rated reviews in the window
- **WHEN** the weekly ranking is computed
- **THEN** that alfajor does NOT appear

### Requirement: Minimum sample guard

The system SHALL exclude alfajores with fewer than the minimum number of reviews
(default 3) in the current window, so that a single lucky rating cannot top the ranking.

#### Scenario: Alfajor below the minimum is excluded

- **GIVEN** an alfajor with 1 review scored 10 in the current window
- **WHEN** the weekly ranking is computed
- **THEN** that alfajor does NOT appear, despite its high average

#### Scenario: Alfajor at the minimum is eligible

- **GIVEN** an alfajor with exactly 3 reviews in the current window
- **WHEN** the weekly ranking is computed
- **THEN** that alfajor is eligible for ranking

### Requirement: Trend vs previous window

The system SHALL compute `trend` by comparing the current window's average against the
previous 7-day window's average (from `now - 14 days` to `now - 7 days`) for the same
alfajor: `up` when the current average is higher, `down` when lower, `same` when equal
(after the 2-decimal rounding), and `new` when the alfajor has no reviews at all in the
previous window. The previous window SHALL NOT apply the minimum-sample guard (any
review count >= 1 is a valid comparison baseline).

#### Scenario: Rising alfajor

- **GIVEN** an alfajor averaging 7.0 in the previous window and 8.5 in the current one
- **WHEN** the weekly ranking is computed
- **THEN** its `trend` is `up`

#### Scenario: Falling alfajor

- **GIVEN** an alfajor averaging 9.0 in the previous window and 8.0 in the current one
- **WHEN** the weekly ranking is computed
- **THEN** its `trend` is `down`

#### Scenario: Newcomer

- **GIVEN** an alfajor with reviews in the current window and none in the previous window
- **WHEN** the weekly ranking is computed
- **THEN** its `trend` is `new`

#### Scenario: Equal averages

- **GIVEN** an alfajor whose two window averages round to the same 2-decimal value
- **WHEN** the weekly ranking is computed
- **THEN** its `trend` is `same`

### Requirement: Empty and small result sets

The system SHALL return a valid (possibly empty or shorter-than-N) array when few or no
alfajores clear the minimum-sample and window filters, without error.

#### Scenario: No eligible alfajores

- **WHEN** no alfajor has at least the minimum reviews in the current window
- **THEN** the endpoint responds `200` with an empty array `[]`

#### Scenario: Fewer eligible alfajores than N

- **GIVEN** only 2 alfajores clear the filters
- **WHEN** the weekly ranking is computed
- **THEN** the response contains those 2 items (not padded to N)
