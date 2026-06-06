# feed-author-follow-state Specification

## Purpose
TBD - created by archiving change add-feed-author-isfollowing. Update Purpose after archive.
## Requirements
### Requirement: Feed reports follow state per author

`GET /feed` SHALL include, for each review item, an `author.isFollowing: boolean` indicating
whether the authenticated user currently follows that author. The endpoint SHALL remain protected
by `JwtAuthGuard`, so the current user is always known. The flag SHALL be `false` for an author the
user does not follow, and SHALL be `false` for the user's own authored reviews.

#### Scenario: Author is followed
- **GIVEN** an authenticated user who follows author A
- **WHEN** they request `GET /feed` and a returned item was authored by A
- **THEN** that item's `author.isFollowing` is `true`

#### Scenario: Author is not followed
- **GIVEN** an authenticated user who does not follow author B
- **WHEN** they request `GET /feed` and a returned item was authored by B
- **THEN** that item's `author.isFollowing` is `false`

#### Scenario: The user's own review
- **GIVEN** an authenticated user
- **WHEN** a returned feed item was authored by that same user
- **THEN** that item's `author.isFollowing` is `false`

### Requirement: Follow state is resolved with a bounded query

The system SHALL resolve follow state only for the authors present on the requested page, via a
single query filtered by those author ids, rather than loading the user's entire following set.
When the page has no items the system SHALL NOT issue the lookup.

#### Scenario: Bounded lookup for the page authors
- **WHEN** a feed page is built with a set of distinct author ids
- **THEN** the follow-state lookup filters by exactly those author ids
- **AND** returns only the subset the user follows

#### Scenario: Empty page skips the lookup
- **GIVEN** a feed query that yields no items
- **WHEN** the page is assembled
- **THEN** no follow-state lookup is performed

