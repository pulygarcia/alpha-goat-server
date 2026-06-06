## Why

The `follows` module supports following/unfollowing (`PUT/DELETE /follows/:userId`) and the
feed already filters by `scope=following`, but `GET /feed` does not tell the client whether
the current user follows each review's author. Without that flag the frontend cannot render a
correct "Seguir" / "Siguiendo" button per feed row. This change exposes follow state on the
feed author as the source of truth.

## What Changes

- Add `isFollowing: boolean` to the feed item author (`FeedAuthorDto`) returned by `GET /feed`.
- Compute it in `FeedFinder` against the authenticated user, **bounded to the authors visible on
  the current page** (not the user's full following set).
- Add `FollowToggler.followingAmong(followerId, candidateIds)` returning the subset of
  `candidateIds` the user follows (single `IN (...)` query; `[]` short-circuits to empty).
- `isFollowing` is `false` for the user's own authored reviews (a user cannot follow themselves).
- Additive response-shape change — no field removed, no endpoint added.

## Capabilities

### New Capabilities
- `feed-author-follow-state`: `GET /feed` reports, per review author, whether the authenticated
  user follows them, resolved with a query bounded to the authors on the page.

### Modified Capabilities
<!-- No existing OpenSpec specs in openspec/specs/ yet; nothing to modify. -->

## Impact

- **Module**: `feed` (`FeedFinder`, `FeedAuthorDto`, controller mapper `toItemDto`) and `follows`
  (`FollowToggler.followingAmong`). No new module.
- **Contract**: `GET /feed` author object gains `isFollowing` — consumed by the alphagoat-client
  `wire-follows` change. Additive, not breaking.
- **Data model**: none. No migration (uses the existing `user_follows` table).
- **Auth**: unchanged — `GET /feed` already requires `JwtAuthGuard`, so the current user is always
  present.
- **Non-goals**: `isFollowing` / `followersCount` on `GET /users/:id` (deferred until a profile
  page exists; that endpoint is public and would need optional auth), a followers list endpoint,
  and any change to `scope=following`.
