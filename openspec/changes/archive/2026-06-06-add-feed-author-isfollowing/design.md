## Context

`GET /feed` (auth-only) returns a page of reviews via `FeedFinder.execute(dto, userId)`, which
already loads each review's `user` relation. `FollowToggler` exposes `followingIds(followerId)`
(all followed ids, used by `scope=following`) but nothing scoped to a specific set of authors.
`FeedAuthorDto` currently has `{ id, username, avatarUrl }`. The frontend needs an `isFollowing`
flag per author to render the follow button.

## Goals / Non-Goals

**Goals:**
- Per-author `isFollowing` on `GET /feed`, correct for the authenticated user and stable across reloads.
- A bounded query: resolve follow state only for the authors on the current page.
- Keep mapping where it already lives (the controller's `toItemDto`).

**Non-Goals:**
- `isFollowing` on `GET /users/:id` (no consumer yet; public endpoint would need optional auth).
- A followers/following list endpoint or counts.
- Any change to `scope=following` behavior.

## Decisions

### Decision 1: Bounded `followingAmong(followerId, candidateIds)` over loading the full set
Add to `FollowToggler`:
```
async followingAmong(followerId, candidateIds): Promise<Set<string>>
  -> if candidateIds empty: return empty Set
  -> repo.find({ where: { followerId, followingId: In(candidateIds) }, select: { followingId: true } })
  -> new Set(rows.map(r => r.followingId))
```
- **Why**: A page shows ~20 reviews / a handful of distinct authors. Filtering by those ids returns
  at most that many rows, regardless of how many accounts the user follows. Reuses the repository
  API (no QueryBuilder).
- **Alternative considered**: reuse `followingIds(userId)` (loads ALL followed ids) and intersect in
  memory. Rejected: unbounded result that scales with the follow graph, not the page.

### Decision 2: Carry `isFollowing` on `FeedRow`, set after entities are loaded
`FeedFinder` adds `isFollowing: boolean` to `FeedRow`. After the reviews (with `user`) are loaded
and ordered, collect distinct `review.user.id`, call `followingAmong(userId, authorIds)`, then set
`row.isFollowing = followed.has(authorId)`. The controller mapper reads `row.isFollowing`.
- **Why**: Keeps the single existing mapping point (`toItemDto`) and adds one bounded query per page.
- **Alternative considered**: a SQL `EXISTS`/join inside the ranked id query. Rejected: the ranked
  query is a hand-tuned raw-id query (commented as fragile with joins + computed-alias ordering);
  adding a correlated subquery there increases risk for no real gain.

### Decision 3: Own reviews resolve to `isFollowing: false` naturally
A user can never follow themselves (enforced in `FollowToggler.follow`), so their id is never in
`user_follows`; `followingAmong` simply will not include it. No special-casing needed.

## Risks / Trade-offs

- [Extra query per feed page] → One additional bounded `IN (...)` query; negligible vs the existing
  count + ranked + hydrate queries, and far cheaper than loading the full following set.
- [Existing unit tests assert full `FeedRow` equality and use review fixtures without `user`] →
  Update fixtures to include `user: { id }` and add `isFollowing` to expected rows; mock
  `followingAmong` (default empty Set) so unrelated tests stay green.
- [`scope=following` redundancy] → On that scope every visible author is followed, so `isFollowing`
  is all `true`; recomputing via `followingAmong` is correct and simpler than special-casing.

## Migration Plan

Additive field — deploy independently of the frontend. Rollback is removing the field from the DTO
and mapper; the new `followingAmong` method can remain unused. No DB migration.

## Open Questions

None blocking. `followersCount` is intentionally deferred to the future profile work.
