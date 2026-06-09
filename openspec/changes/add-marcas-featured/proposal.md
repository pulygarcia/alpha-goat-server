## Why

The feed's right rail (alphagoat-client, trozo 4) has a "marcas en foco" widget with no
endpoint to feed it. We want that widget to surface **the brands people are most divided
about right now** — not the most popular ones (that is just volume), but the most
*controversial*: where recent reviewers strongly disagree. This drives engagement (a
divisive brand invites people to weigh in) and gives the rail an editorial angle the plain
`GET /marcas` catalog cannot.

## What Changes

- New public endpoint **`GET /marcas/featured`** in the existing `marcas` module.
- New atomic service `MarcaFeaturedFinder` that ranks brands by **how spread out their
  recent ratings are** (rating dispersion = controversy), over a ~30-day window, only over
  reviews of `APPROVED` alfajores, requiring a minimum sample so the signal is not noise.
- New response DTO `FeaturedMarcaDto` returning the shape already agreed with the frontend:
  `{ id, nombre, provincia, logoUrl, productCount, avgScore }`.
- Controller route declared **before** `GET /marcas/:id` to avoid the param-route collision.
- Aggregation (count / avg / dispersion / group by) uses the QueryBuilder — unavoidable for
  SQL aggregates — mirroring `feed-hero-finder`. Final brand entities are hydrated via the
  repository API.

This is **additive**: a brand-new endpoint. No existing endpoint contract changes. The
controversy metric stays **internal** — it decides ranking but is NOT exposed in the response
(no contract extension for the frontend in this iteration).

## Capabilities

### New Capabilities
- `marcas-featured`: selecting and returning the "en foco" brands for the feed rail, ranked
  by recent rating controversy, with the display fields the rail needs.

### Modified Capabilities
<!-- None. GET /marcas and GET /marcas/:id are unchanged. -->

## Impact

- **Module**: `src/modules/marcas/` — new `services/marca-featured-finder.ts` (+ spec), new
  `dto/featured-marca.dto.ts`, new route in `marcas.controller.ts` (+ controller spec),
  wiring in `marcas.module.ts`. Reads from `reviews` and `alfajores` (cross-module reads,
  like the feed services already do).
- **Frontend (alphagoat-client)**: unblocks the rail's "marcas en foco". Response shape is the
  one already documented in the front's `docs/progress.md`. No FE change required by this PR.
- **Endpoints**: adds `GET /marcas/featured` (public). No new dependencies, no migration
  (read-only over existing tables).
- **Non-goals**: exposing the controversy/dispersion value or a "weekly review count" in the
  response; an admin "featured" flag; a full brands page. Volume-based or combined
  (volume × controversy) ranking is explicitly deferred — this iteration is controversy-only.
