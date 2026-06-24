# user-profile Specification

## Purpose
Public profile lookup by username with aggregated social data (follower/following/review counts and the viewer's follow relationship), exposing the email only to the profile owner. Feeds the alphagoat-client `/u/[username]` page.

## Requirements
### Requirement: Resolve a public profile by username

The system SHALL expose `GET /users/by-username/:username` as a public endpoint with optional authentication, returning a `ProfileResponseDto` for the user whose username matches exactly (case-sensitive, as stored).

#### Scenario: Existing user resolved anonymously
- **WHEN** an anonymous request is made to `GET /users/by-username/:username` for an existing user
- **THEN** the system responds `200` with `id`, `username`, `avatarUrl`, `role`, `createdAt`, `followersCount`, `followingCount`, `reviewsCount`
- **AND** `isFollowing` is `false`
- **AND** `email` is omitted

#### Scenario: Username not found
- **WHEN** a request targets a username that does not exist
- **THEN** the system responds `404 Not Found`

### Requirement: Social aggregates on the profile

The profile response SHALL include `followersCount` (users who follow this profile), `followingCount` (users this profile follows), and `reviewsCount` (reviews authored by this user), each as a non-negative integer.

#### Scenario: User with no social activity
- **WHEN** the profile belongs to a user with no followers, no followed users and no reviews
- **THEN** `followersCount`, `followingCount` and `reviewsCount` are all `0`

#### Scenario: Counts reflect current state
- **WHEN** the profile belongs to a user followed by 3 users, following 2 users, with 5 reviews
- **THEN** `followersCount` is `3`, `followingCount` is `2` and `reviewsCount` is `5`

### Requirement: isFollowing reflects the viewer relationship

When the request is authenticated, the system SHALL compute `isFollowing` as whether the authenticated user currently follows the requested profile. For an anonymous request `isFollowing` SHALL be `false`. When the requested profile is the authenticated user's own profile, `isFollowing` SHALL be `null`.

#### Scenario: Authenticated viewer follows the profile
- **WHEN** an authenticated user who follows the profile requests it
- **THEN** `isFollowing` is `true`

#### Scenario: Authenticated viewer does not follow the profile
- **WHEN** an authenticated user who does not follow the profile requests it
- **THEN** `isFollowing` is `false`

#### Scenario: Viewing own profile
- **WHEN** an authenticated user requests their own profile by username
- **THEN** `isFollowing` is `null`

### Requirement: Email visibility restricted to the owner

The system SHALL include `email` in the profile response only when the requested profile belongs to the authenticated user. For anonymous requests and for any other authenticated viewer, `email` SHALL be omitted.

#### Scenario: Owner sees their own email
- **WHEN** an authenticated user requests their own profile by username
- **THEN** the response includes `email` with the user's address

#### Scenario: Other viewer does not see the email
- **WHEN** an authenticated user requests a different user's profile
- **THEN** the response omits `email`
