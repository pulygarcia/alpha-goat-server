# add-recommendations — design

## Context

The feed rail needs `GET /recommendations`. The closest precedents are `ranking-weekly`
(WeeklyRankingFinder) and `marcas-featured` (MarcaFeaturedFinder): a windowed/aggregated
computation over reviews of APPROVED alfajores with a minimum-sample guard, done in two steps
(rank via a grouped query, hydrate via the repository API). This design follows that pattern.
The new parts are the per-user taste fingerprint and the cosine-based match.

## Goals / Non-Goals

**Goals:**
- A content-based recommendation over the 5 axes: fingerprint the user, match against
  candidate community profiles, blend with quality, exclude already-reviewed.
- Same testability conventions as the precedents (`now`/`limit` injected where relevant; the
  scoring math lives in unit-testable TypeScript).

**Non-Goals:**
- Collaborative filtering, caching, a full discovery page (see proposal Non-goals).

## Decisions

- **Module `recommendations`, not a service inside `alfajores`/`reviews`**: the capability
  aggregates reviews across alfajores and marcas and reads the user's own reviews, like `feed`
  and `ranking`. Keeps `alfajores`/`reviews` focused. Layout:
  `recommendations.controller.ts`, `recommendations.module.ts`,
  `dto/recommendation-item.dto.ts`, `services/user-taste-fingerprint.ts`,
  `services/recommendation-finder.ts` (+ specs).

- **Fingerprint uses the user's OWN axis ratings, weighted by their `ratingGeneral`**: the
  taste signal is how the user perceived and valued each alfajor, not the community profile.
  `F = Σ(g_i · a_i) / Σ(g_i)` over the user's reviews of APPROVED alfajores, where `g_i` is the
  user's `ratingGeneral` and `a_i` the 5-axis vector of review `i`. Computed in TypeScript from
  a bounded repository read (`reviews` where `userId`, joined to alfajor for the APPROVED
  filter). This keeps the weighting rule unit-testable.

- **Candidate profiles via one grouped query**: a single QueryBuilder query over reviews of
  APPROVED alfajores, grouped by alfajor, computing `AVG` of each of the 5 axes, `AVG` of
  `ratingGeneral`, and `COUNT`; `HAVING COUNT >= MIN_REVIEWS`; excluding alfajores the user has
  already reviewed (`NOT IN (subquery of user's reviewed alfajorIds)` or an anti-join).
  QueryBuilder is unavoidable (AVG/COUNT/GROUP BY/HAVING), same justification as the
  precedents. Returns one row per eligible candidate: `alfajorId`, 5 avg axes, `avgGeneral`.

- **Match and score computed in TypeScript**: the finder takes the fingerprint vector and each
  candidate's avg-axis vector and computes cosine similarity → `matchPct` (×100, rounded int),
  then `score = 0.7·matchPct + 0.3·(avgGeneral·10)` (rounded 2 decimals), sorts desc, takes N.
  Keeping cosine + blend in TS makes every scoring scenario directly unit-testable. Cosine is
  safe here because axis values are non-negative (similarity ∈ [0,1]); guard the zero-vector
  case (return matchPct 0).

- **Cosine, not euclidean distance**: cosine compares the *shape* of the taste profile
  (relative balance of the axes) and is invariant to how "intense" a rater the user is, which
  is the right notion for "alfajores like the ones you like". Euclidean would conflate taste
  shape with absolute rating magnitude.

- **Cold start handled in the finder**: if the fingerprint has no contributing reviews, skip
  the cosine step and order candidates by `avgGeneral` only, emitting `matchPct: null` and
  `score = avgGeneral·10`. Same candidate query (min-sample + APPROVED), so the fallback reuses
  one code path.

- **Hydration via repository API**: fetch the top-N alfajores with `relations: ['marca']` and
  map preserving order, exactly like the precedents' step 2.

- **Mapping in the DTO**: `RecommendationItemDto.from(row)` static, consistent with the
  project convention. `matchPct` is `number | null`.

- **Constants**: `AXES = ['dulzor','cantidadDDL','calidadBano','ratioTapaRelleno','textura']`,
  `MIN_REVIEWS = 3`, `DEFAULT_LIMIT = 6`, `MATCH_WEIGHT = 0.7` — module-level constants with
  comments, like the precedents. `MIN_REVIEWS = 3` matches ranking-weekly's trustworthiness bar.

## Risks / Trade-offs

- [Sparse data: with few reviewed alfajores per user the fingerprint is noisy] → acceptable;
  the cold-start and small-result paths are specced, and the rail's empty state is part of the
  sprint (trozo 5). The min-sample guard keeps candidate profiles trustworthy.
- [Ranking in TypeScript loads all eligible candidate rows before taking N] → the grouped query
  already collapses to one row per alfajor (catalog-sized, small), so this is bounded in
  practice; revisit only if the catalog grows large (then push the score into SQL or cap rows).
- [Cosine ignores magnitude, so a uniformly-high and a uniformly-low profile can match if their
  shapes align] → intended (taste shape, not intensity); the `score` quality term re-introduces
  magnitude so low-quality matches still sink.
- [Anti-join / NOT IN on the user's reviewed alfajores] → bounded by the user's review count;
  prefer a left-join-anti or `NOT IN (subquery)` and comment the choice.
