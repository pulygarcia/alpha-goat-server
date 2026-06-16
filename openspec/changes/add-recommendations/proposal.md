# add-recommendations

## Why

The feed rail has a "Recomendado para vos" section that is still a `PendingSection`
placeholder in the frontend. It needs a backend endpoint that answers "which alfajores you
have not tried yet best fit your taste". The recommendation logic must be specced because the
numbers are user-facing (`matchPct`, `score`) and the scoring is a product decision, not an
implementation detail.

## What Changes

- New module `src/modules/recommendations/` (the capability aggregates across reviews,
  alfajores and marcas, like `feed` and `ranking`; it is not CRUD on a single entity).
- New authenticated endpoint `GET /recommendations` (`JwtAuthGuard`) returning the top N
  alfajores the current user has **not** reviewed, each with:
  - `matchPct`: how close the alfajor's community axis-profile is to the user's taste
    fingerprint (cosine similarity, `0..100`; `null` in the cold-start fallback).
  - `score`: ordering strength, a `0.7 · matchPct + 0.3 · (ratingGeneral·10)` blend of taste
    fit and overall quality, so a good fit that is generally bad does not top the list.
  - `marca`: display fields for the rail (`id`, `nombre`, `logoUrl`).
- Taste fingerprint: weighted average of the 5 axes of the alfajores the user reviewed,
  weighted by the `ratingGeneral` the user gave each (what they rated highest counts most).
- Eligibility follows the `ranking-weekly` / `marcas-featured` precedent: only reviews of
  `APPROVED` alfajores count, and a candidate alfajor needs a minimum sample of reviews
  (default 3) for its profile to be trustworthy.
- Cold start (user with no reviews → no fingerprint): fall back to the top alfajores by
  community `ratingGeneral` (same minimum sample), with `matchPct: null`.
- Additive only: no existing endpoint or response shape changes. **No breaking changes.**

## Capabilities

### New Capabilities

- `recommendations`: building the user taste fingerprint, scoring eligible alfajores by taste
  fit and quality, the cold-start fallback, exclusions, and the response shape.

### Modified Capabilities

(none — no existing spec's requirements change)

## Impact

- New code only: `src/modules/recommendations/` (controller, module, dto/, services for the
  fingerprint and the finder).
- `app.module.ts` registers the new module.
- Reads `reviews`, `alfajores`, `marcas` tables; no schema changes, no migrations.
- Frontend contract: consumed by the rail's "Recomendado para vos" (To do task in the sprint,
  currently blocked on this).

## Non-goals

- A full recommendations / discovery page — this only serves the rail's top-N.
- Collaborative filtering or "users like you" — this is content-based on the 5 axes only.
- Caching / materialization of recommendations — computed on request, like ranking-weekly.
- Recommending `PENDING` alfajores or alfajores below the minimum sample.
- Personalized weighting of which axes matter per user beyond the rating-weighted average
  (no learned per-axis importance).
