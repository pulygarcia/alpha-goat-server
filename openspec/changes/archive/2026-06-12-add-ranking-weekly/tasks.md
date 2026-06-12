# add-ranking-weekly — tasks

## 1. Module scaffold

- [x] 1.1 Create `src/modules/ranking/` with `ranking.module.ts` (imports TypeOrmModule.forFeature([Review, Alfajor])) and register `RankingModule` in `app.module.ts`

## 2. Finder

- [x] 2.1 Implement `services/weekly-ranking-finder.ts`: single 14-day aggregation query (FILTER aggregates per window, HAVING min sample on current window, ORDER BY score DESC, LIMIT N) + hydration with `relations: ['marca']` preserving order + trend mapping after 2-decimal rounding
- [x] 2.2 Write `services/weekly-ranking-finder.spec.ts` covering every spec scenario: shape/order, window isolation, APPROVED-only, min-sample exclusion/inclusion, trend up/down/same/new, empty and short results

## 3. Endpoint

- [x] 3.1 Create `dto/weekly-ranking-item.dto.ts` with `@ApiProperty` and static `from(row)` (trend as `'up' | 'down' | 'same' | 'new'`, marca as `{ id, nombre, logoUrl }`)
- [x] 3.2 Create `ranking.controller.ts`: public `GET /ranking/weekly`, thin handler calling the finder and mapping via the DTO, with Swagger decorators

## 4. Wrap-up

- [x] 4.1 Run `npm run lint`, `npm run build`, `npm run test:cov` (>= 85%) and fix anything that fails
- [x] 4.2 Update `docs/progress.md` (back) and `alphagoat-client/docs/progress.md` ("listo en back, falta conectar en FE")
