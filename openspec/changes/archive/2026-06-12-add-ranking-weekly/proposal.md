# add-ranking-weekly

## Why

The feed rail has a "Ranking semanal" section that is still a `PendingSection` placeholder in the frontend. It needs a backend endpoint that answers "which alfajores were the best this week, and are they rising or falling" — the score calculation must be specced because the number is user-facing and comparable week to week.

## What Changes

- New module `src/modules/ranking/` (the capability is broader than alfajores or reviews: it aggregates across both, like `feed`).
- New public endpoint `GET /ranking/weekly` returning the top N alfajores of the last 7 days, each with:
  - `score`: average `ratingGeneral` of the alfajor's reviews in the current 7-day window.
  - `trend`: direction vs the previous 7-day window (`up` / `down` / `same` / `new`), derived from the delta of the two window averages. `new` when the alfajor has no qualifying sample in the previous window.
  - `marca`: display fields for the rail (id, nombre, logoUrl).
- Ranking rules follow the `marcas-featured` precedent: only reviews of `APPROVED` alfajores count, and a minimum sample of reviews in the current window is required (lower than the 5 used by marcas-featured, since the window is 7 days instead of 30 — default 3).
- Additive only: no existing endpoint or response shape changes. **No breaking changes.**

## Capabilities

### New Capabilities

- `ranking-weekly`: selecting and returning the weekly top alfajores for the feed rail — window definition, score formula, trend computation, minimum-sample guard, and response shape.

### Modified Capabilities

(none — no existing spec's requirements change)

## Impact

- New code only: `src/modules/ranking/` (controller, module, dto/, services/ranking-weekly-finder).
- `app.module.ts` registers the new module.
- Reads `reviews`, `alfajores`, `marcas` tables; no schema changes, no migrations.
- Frontend contract: consumed by the rail's "Ranking semanal" (To do task in the sprint, currently blocked on this).

## Non-goals

- The full ranking page (`Feature ranking` in the backlog) — this only serves the rail's top-N.
- Recommendations (`GET /recommendations` is a separate task/module).
- Caching/materialization of the ranking — computed on request, like marcas-featured.
- Exposing the raw delta value — the rail only renders direction (▲▼); the response carries `trend`, not the number.
