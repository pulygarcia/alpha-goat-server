## 1. DTO

- [x] 1.1 Create `src/modules/marcas/dto/featured-marca.dto.ts` → `FeaturedMarcaDto` with
  `{ id, nombre, provincia, logoUrl, productCount, avgScore }` (`@ApiProperty`, `provincia`
  and `logoUrl` nullable). Static `from(marca, { productCount, avgScore })` mapper, mirroring
  `MarcaResponseDto.from`. No `descripcion`/`createdAt`, no controversy field.

## 2. Finder service

- [x] 2.1 Create `src/modules/marcas/services/marca-featured-finder.ts` → `MarcaFeaturedFinder`
  (`@Injectable`). Inject the `Review`, `Alfajor` and `Marca` repositories. Named constants:
  `WINDOW_DAYS = 30`, `MIN_REVIEWS = 5`, `DEFAULT_LIMIT = 5`. `execute(now = new Date())`
  returns the ranked display rows.
- [x] 2.2 Step 1 (ranking) — QueryBuilder aggregate over `Review` joined to `Alfajor`: filter
  `createdAt >= now - WINDOW_DAYS` and alfajor `status = APPROVED`, group by the alfajor's
  `marcaId`, select `COUNT(*)` and `STDDEV_SAMP(ratingGeneral)` as controversy, `HAVING
  COUNT(*) >= MIN_REVIEWS`, `ORDER BY` controversy DESC, `LIMIT` N. Comment WHY QueryBuilder
  is used (SQL aggregates have no repo-API equivalent — same as `feed-hero-finder`).
- [x] 2.3 Step 2 (display) — for the winning `marcaId`s: hydrate the brands via repository API
  (`find({ where: { id: In(ids) } })`) and compute all-time `productCount` (count of `APPROVED`
  alfajores per brand) and all-time `avgScore` (avg `ratingGeneral` per brand), bounded to
  those ids. Preserve the controversy ranking order in the returned list.
- [x] 2.4 Add `marca-featured-finder.spec.ts` (mock repositories / query builder): divided
  brand outranks consensus brand, brand below `MIN_REVIEWS` excluded, only APPROVED counted,
  empty result when none qualify, respects the limit, order preserved after hydration.

## 3. Controller wiring

- [x] 3.1 In `src/modules/marcas/marcas.controller.ts` add `@Get('featured')` returning
  `FeaturedMarcaDto[]`, declared BEFORE `@Get(':id')` to avoid the param-route collision.
  Public (no guard), with `@ApiOperation`/`@ApiResponse(200)`.
- [x] 3.2 Register `MarcaFeaturedFinder` in `marcas.module.ts` providers; ensure the `Review`
  and `Alfajor` entities are available to the module's `TypeOrmModule.forFeature` (add if missing).
- [x] 3.3 Update `marcas.controller.spec.ts`: featured route returns mapped DTOs; assert it is
  not shadowed by `:id`.

## 4. Verify and close

- [x] 4.1 Run `npm run lint` and `npm run test` — all green, coverage threshold (>= 85%) holds.
- [x] 4.2 Smoke-test against Neon: `GET /marcas/featured` returns the shape and a sensible
  controversy order with the seed data.
- [x] 4.3 Update `docs/progress.md` (mark `GET /marcas/featured` done) and
  `alphagoat-client/docs/progress.md` (endpoint listo en back, falta conectar en FE), per the
  agreed cross-repo workflow.
- [ ] 4.4 Archive the change with `/opsx:archive` once implemented and verified.
