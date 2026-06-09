## Context

The feed rail needs a "marcas en foco" widget. The `marcas` module already exposes the
catalog (`GET /marcas`, paginated) and detail (`GET /marcas/:id`), plus atomic services
(`MarcaFinder`, `MarcaSearcher`, ...) and `MarcaResponseDto.from`. What is missing is a way
to pick a small, editorially-interesting subset. The product decision (see proposal) is to
surface the **most controversial** brands — the ones recent reviewers most disagree about —
rather than the most popular. The data lives across `reviews` (the ratings) and `alfajores`
(which ties a review to a `marca` and carries the `APPROVED` status). The feed module already
reads across these tables, so a cross-module read from `marcas` is consistent with the codebase.

## Goals / Non-Goals

**Goals:**
- A public `GET /marcas/featured` returning the agreed shape
  `{ id, nombre, provincia, logoUrl, productCount, avgScore }`.
- Rank brands by recent rating **controversy** (dispersion), with a guard against small-sample
  noise, in a testable way (injectable `now`).
- Reuse the module's atomic-service + DTO patterns; keep the query bounded.

**Non-Goals:**
- Exposing the controversy value or a recent-review count in the response (stays internal).
- Volume-based or combined (volume × controversy) ranking — explicitly deferred.
- An admin `featured` flag, a brands page, pagination, or any write path / migration.

## Decisions

### Decision 1: "Controversy" = dispersion of recent ratings, not volume or average

A brand is "en foco" when **its recent reviewers strongly disagree**. The key insight is
that neither the count of reviews nor their average captures this:

- The **count** measures how much a brand is *talked about* (popularity), not whether people
  agree. A brand can have 200 reviews that are all 9-10: lots of attention, zero controversy.
- The **average** can be identical for a calm brand and a divisive one. Five reviews of
  `9, 10, 9, 10, 8` and five of `1, 10, 2, 9, 3` both sit near the middle once averaged, yet
  the first is a consensus and the second is a war.

What separates them is **how spread out the individual ratings are around their own average**.
Conceptually the service, for each brand, looks at every recent rating, measures how far each
one sits from that brand's average, and boils all those distances down into a single number:
small when the ratings huddle together (consensus), large when they scatter (controversy).
Postgres computes this directly as a standard-deviation aggregate — the service does not do the
arithmetic by hand; it just asks the database to group the recent ratings by brand and return
that dispersion number alongside the count and the average.

- **Why over alternatives**: "most reviewed" was considered and rejected as the primary signal
  — it answers a different question (popularity). Average-based ranking cannot distinguish
  agreement from disagreement at all. Dispersion is the only one of the three that means
  "divisive".

### Decision 2: Minimum sample size to make dispersion meaningful

Dispersion is unreliable with very few data points: two reviews of `1` and `10` produce a huge
spread that is coincidence, not a genuinely divided audience. So the service only considers
brands with **at least 5 recent reviews** (a `HAVING count >= 5` on the grouped aggregate).
Brands below the threshold are excluded entirely rather than ranked low.

- **Why**: Without the guard, obscure brands with 2-3 polarized reviews would dominate over
  brands with 40 genuinely split reviews. 5 is a pragmatic floor; it is a named constant so it
  is easy to tune.

### Decision 3: ~30-day window, APPROVED alfajores only

The ranking window is the last ~30 days (a named constant), wider than the feed's 7-day
"week" windows. Controversy needs a bigger window than volume to accumulate enough sample for
dispersion to be stable; a divisive brand tends to be divisive over weeks, not in a single day.
Only reviews of `APPROVED` alfajores count (pending/rejected alfajores are not public).

- **Why over alternatives**: a 7-day window (matching `feed/hero`) was considered but would too
  often leave fewer than 5 reviews per brand, collapsing the result set.

### Decision 4: Two-step query — aggregate to rank, repository API to hydrate

Like `FeedFinder`, the service runs in two passes:
1. A **QueryBuilder** aggregate over `reviews` joined to `alfajores`: filter by window +
   `APPROVED`, group by the alfajor's `marcaId`, compute count + dispersion, apply the minimum,
   order by dispersion DESC, limit N. This returns only the winning `marcaId`s (and their
   numbers). QueryBuilder is unavoidable here because `STDDEV`/`AVG`/`COUNT`/`GROUP BY` have no
   repository-API equivalent — same justification as `feed-hero-finder`.
2. A **repository-API** `find({ where: { id: In(ids) } })` to hydrate those few brands, then a
   second bounded aggregate (or per-brand counts) for the **display** fields `productCount`
   (all-time `APPROVED` alfajores of the brand) and `avgScore` (all-time avg `ratingGeneral`).

The selection is by *recent controversy* but the displayed `productCount`/`avgScore` are
*all-time* — deliberately: the rail shows the brand's overall catalog and standing, not the
windowed numbers.

- **Why**: keeps each query bounded (we never load all brands/reviews) and avoids the TypeORM
  pitfall of mixing computed-alias ordering with entity hydration in one query.

### Decision 5: DTO and route placement

A dedicated `FeaturedMarcaDto` (not `MarcaResponseDto`, which lacks `productCount`/`avgScore`
and carries `descripcion`/`createdAt` the rail does not need). Mapping lives in a static
`FeaturedMarcaDto.from(marca, { productCount, avgScore })`, consistent with `MarcaResponseDto.from`.
The route `@Get('featured')` MUST be declared **before** `@Get(':id')` in `MarcasController` so
"featured" is not captured as an `:id` (which would also fail the `ParseUUIDPipe`).

## Risks / Trade-offs

- **Small / empty result set** (few brands clear the 5-review, 30-day bar, e.g. early in the
  product's life) → the endpoint returns fewer than N (possibly `[]`). The rail must handle an
  empty/short list. Acceptable; the seed data has enough reviews for a non-empty result.
- **Dispersion still sensitive near the threshold** → mitigated by the named minimum; tunable.
- **Cross-module read from `marcas` into `reviews`/`alfajores`** → already the pattern in the
  feed module; no new coupling concern.
- **`STDDEV` flavor** (`STDDEV_SAMP` vs `STDDEV_POP`) → use sample stddev (`STDDEV_SAMP`,
  Postgres default `STDDEV`); with the 5-review minimum the difference is immaterial and either
  is defensible. Documented in the service.

## Migration Plan

None. Read-only over existing tables; no schema change, no migration. Deploy is additive;
rollback is removing the route. Frontend can integrate independently once live.

## Open Questions

- Final values for N (default 5), the minimum sample (5), and the window (30 days) — current
  defaults are reasonable and live as named constants; revisit if the result set is too small
  against real data.
