# add-ranking-weekly — design

## Context

The feed rail needs `GET /ranking/weekly`. The closest precedent is `marcas-featured`
(MarcaFeaturedFinder): a windowed aggregation over reviews of APPROVED alfajores with a
minimum-sample guard, done in two steps (rank ids via QueryBuilder, hydrate via repository
API). This design follows that pattern; the new part is the second window for `trend`.

## Goals / Non-Goals

**Goals:**
- Top-N alfajores by current-window average rating, with trend direction vs the previous window.
- Same testability conventions as marcas-featured (`now` and `limit` injected).

**Non-Goals:**
- Full ranking page, recommendations, caching (see proposal Non-goals).

## Decisions

- **Module `ranking`, not a service inside `alfajores`**: the capability aggregates reviews
  across alfajores and marcas, like `feed`. Keeps `alfajores` CRUD-only. Layout:
  `ranking.controller.ts`, `ranking.module.ts`, `dto/weekly-ranking-item.dto.ts`,
  `services/weekly-ranking-finder.ts` (+ spec).
- **Rolling 7-day windows, not calendar weeks**: consistent with the feed's notion of "week"
  and with marcas-featured's rolling window; avoids the Monday-morning empty ranking that a
  calendar week would produce. Previous window is `[now-14d, now-7d)`.
- **One aggregation query for both windows**: a single QueryBuilder query over reviews of the
  last 14 days, grouping by alfajor and using conditional aggregates
  (`AVG(...) FILTER (WHERE r.createdAt >= :weekAgo)` for current, `FILTER (WHERE <)` for
  previous; Postgres supports FILTER). QueryBuilder is unavoidable (AVG/COUNT/GROUP BY/HAVING),
  same justification as marcas-featured. Ranking, the min-sample HAVING and the top-N LIMIT all
  happen in this query; it returns at most N raw rows (alfajorId, score, prevScore).
- **Trend computed in TypeScript, not SQL**: the query returns the two averages; the finder maps
  them to `'up' | 'down' | 'same' | 'new'` after the 2-decimal rounding. Keeps the comparison
  rule (rounding before comparing, `new` on null prevScore) in unit-testable code.
- **Hydration via repository API**: fetch the N alfajores with `relations: ['marca']` and map
  preserving the ranking order, exactly like MarcaFeaturedFinder's step 2.
- **Mapping in the DTO**: `WeeklyRankingItemDto.from(row)` static, consistent with the
  project convention.
- **Constants**: `WINDOW_DAYS = 7`, `MIN_REVIEWS = 3`, `DEFAULT_LIMIT = 5` — module-level
  constants with comments, like marcas-featured. MIN_REVIEWS is lower than marcas-featured's 5
  because the window is 4× shorter; 3 still blocks the single-lucky-rating case the spec guards.

## Risks / Trade-offs

- [Sparse data: with few reviews per week the ranking may often be short or empty] → acceptable;
  the spec defines empty/short results as valid, and the frontend's empty state is part of the
  sprint (trozo 5).
- [`AVG ... FILTER` returns NULL for an alfajor with current-window reviews below min sample] →
  not an issue: the HAVING clause on the current-window count excludes those rows entirely.
- [Two-window FILTER aggregates are slightly less obvious than two separate queries] → mitigated
  with comments; the alternative (two queries + merge in TS) doubles round-trips and the merge
  logic is more error-prone than one grouped row per alfajor.
