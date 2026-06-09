# marcas-featured

Selecting and returning the "en foco" brands for the feed rail, ranked by recent rating
controversy, with the display fields the rail needs.

## Requirements

### Requirement: Featured brands endpoint

The system SHALL expose a public `GET /marcas/featured` endpoint (no authentication) that
returns a list of "en foco" brands for the feed rail. Each item SHALL have the shape
`{ id, nombre, provincia, logoUrl, productCount, avgScore }`, where `productCount` is the
brand's all-time count of `APPROVED` alfajores and `avgScore` is the brand's all-time average
`ratingGeneral`. The list SHALL contain at most N items (default 5). The endpoint SHALL NOT
expose the controversy/dispersion metric used for ranking.

#### Scenario: Returns the agreed shape
- **WHEN** an anonymous client requests `GET /marcas/featured`
- **THEN** the response is `200` with a JSON array
- **AND** each item has `id`, `nombre`, `provincia`, `logoUrl`, `productCount`, `avgScore`
- **AND** no controversy/stddev or per-window count field is present

#### Scenario: Public access
- **WHEN** the request carries no authentication
- **THEN** the endpoint still responds `200` (it is public, like `GET /marcas` and `/feed/stats`)

#### Scenario: Route is not shadowed by the id route
- **WHEN** the client requests `GET /marcas/featured`
- **THEN** it is served by the featured handler
- **AND** "featured" is NOT treated as a brand id (no UUID validation error)

### Requirement: Ranking by recent rating controversy

The system SHALL rank candidate brands by the dispersion (standard deviation) of the
`ratingGeneral` of their reviews within the ranking window, in descending order (most
divided first). Only reviews of `APPROVED` alfajores within the window SHALL be considered.

#### Scenario: A divided brand outranks a consensus brand
- **GIVEN** brand A's recent ratings are tightly clustered (e.g. 9, 10, 9, 10, 8)
- **AND** brand B's recent ratings are widely split (e.g. 1, 10, 2, 9, 3)
- **WHEN** the featured list is computed
- **THEN** brand B is ranked above brand A
- **AND** this holds even if both brands have a similar average and review count

#### Scenario: Only approved alfajores count
- **WHEN** computing controversy for a brand
- **THEN** reviews of its `PENDING` or `REJECTED` alfajores are ignored

### Requirement: Minimum sample guard

The system SHALL exclude brands with fewer than the minimum number of reviews (default 5) in
the ranking window, so that dispersion computed from too few ratings does not surface a brand.

#### Scenario: Brand below the minimum is excluded
- **GIVEN** a brand has only 2 reviews in the window, scored 1 and 10
- **WHEN** the featured list is computed
- **THEN** that brand does NOT appear, despite its high raw dispersion

#### Scenario: Brand at or above the minimum is eligible
- **GIVEN** a brand has at least 5 reviews in the window
- **WHEN** the featured list is computed
- **THEN** that brand is eligible for ranking

### Requirement: Empty and small result sets

The system SHALL return a valid (possibly empty or shorter-than-N) array when few or no
brands clear the minimum-sample and window filters, without error.

#### Scenario: No eligible brands
- **WHEN** no brand has at least the minimum reviews in the window
- **THEN** the endpoint responds `200` with an empty array `[]`

#### Scenario: Fewer eligible brands than N
- **GIVEN** only 3 brands clear the filters
- **WHEN** the featured list is computed
- **THEN** the response contains those 3 items (not padded to N)
