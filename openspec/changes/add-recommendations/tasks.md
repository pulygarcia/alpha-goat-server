# add-recommendations — tasks

## 1. Module scaffold

- [x] 1.1 Create `src/modules/recommendations/` with `recommendations.module.ts`
      (imports `TypeOrmModule.forFeature([Review, Alfajor])`) and register
      `RecommendationsModule` in `app.module.ts`

## 2. Taste fingerprint

- [x] 2.1 Implement `services/user-taste-fingerprint.ts`: bounded repository read of the user's
      reviews of APPROVED alfajores; build the rating-weighted 5-axis vector
      `F = Σ(g_i·a_i)/Σ(g_i)`; return `null` (or an empty marker) when the user has no
      qualifying reviews (cold start)
- [x] 2.2 Write `services/user-taste-fingerprint.spec.ts`: rating-weighted average, APPROVED-only
      filter, single review, and the no-reviews (cold-start) case

## 3. Finder

- [x] 3.1 Implement `services/recommendation-finder.ts`: one grouped QueryBuilder over reviews of
      APPROVED alfajores (AVG of 5 axes + AVG ratingGeneral + COUNT, `HAVING COUNT >= MIN_REVIEWS`,
      excluding the user's already-reviewed alfajores); cosine `matchPct`, `score` blend, sort
      desc, take N; cold-start branch ordering by `avgGeneral` with `matchPct: null`; hydrate
      top-N via `relations: ['marca']` preserving order
- [x] 3.2 Write `services/recommendation-finder.spec.ts` covering every spec scenario: shape/order,
      exclusion of already-reviewed, min-sample exclusion/inclusion, APPROVED-only, match-high on
      proportional profile, quality tie-break, cold-start fallback, empty and short results

## 4. Endpoint

- [x] 4.1 Create `dto/recommendation-item.dto.ts` with `@ApiProperty` and static `from(row)`
      (`matchPct: number | null`, `marca` as `{ id, nombre, logoUrl }`)
- [x] 4.2 Create `recommendations.controller.ts`: authenticated `GET /recommendations`
      (`JwtAuthGuard` + `CurrentUser`), optional `limit` query (1..20, default 6), thin handler
      calling the finder and mapping via the DTO, with Swagger decorators

## 5. Wrap-up

- [x] 5.1 Run `npm run lint`, `npm run build`, `npm run test:cov` (>= 85%) and fix anything that fails
- [x] 5.2 Update `docs/progress.md` (back) and `alphagoat-client/docs/progress.md`
      ("listo en back, falta conectar en FE")
