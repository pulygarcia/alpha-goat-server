## 1. Follows service

- [x] 1.1 Add `followingAmong(followerId: string, candidateIds: string[]): Promise<Set<string>>` to `FollowToggler` (import `In`; return empty Set when `candidateIds` is empty; `find` with `where: { followerId, followingId: In(candidateIds) }` and `select: { followingId: true }`)
- [x] 1.2 Add a unit test in `follow-toggler.spec.ts`: returns the followed subset; returns empty Set (no query) for empty input

## 2. Feed finder

- [x] 2.1 Add `isFollowing: boolean` to the `FeedRow` interface in `feed-finder.ts`
- [x] 2.2 After loading/ordering the review entities, collect distinct `review.user.id`, call `follows.followingAmong(userId, authorIds)`, and set `row.isFollowing` per row
- [x] 2.3 Update `feed-finder.spec.ts`: add `followingAmong` to the `follows` mock (default empty Set), add `user: { id }` to review fixtures, include `isFollowing` in expected rows, and add a test asserting `isFollowing` is `true` only for followed authors

## 3. Response contract

- [x] 3.1 Add `@ApiProperty() isFollowing: boolean;` to `FeedAuthorDto` in `feed-response.dto.ts`
- [x] 3.2 Set `author.isFollowing: row.isFollowing` in `toItemDto` in `feed.controller.ts`

## 4. Verify and close

- [x] 4.1 Run `npm run lint` and `npm run test` — all green
- [x] 4.2 Update backend docs if they describe the `GET /feed` contract (e.g. README / API docs)
- [ ] 4.3 Archive the change with `/opsx:archive` once implemented and verified
