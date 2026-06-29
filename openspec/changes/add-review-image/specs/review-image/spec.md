## ADDED Requirements

### Requirement: Upload a review photo

The system SHALL expose `POST /reviews/:id/foto` accepting a
`multipart/form-data` request with a `file` field, protected by `JwtAuthGuard`.
The file MUST be validated as `jpeg`, `png`, or `webp` and at most 5 MB. On
success the system SHALL upload the image to Cloudinary under folder `reviews`
with `publicId` equal to the review id and overwrite enabled, persist the
returned URL on the review's `fotoUrl`, and respond with the updated
`ReviewResponseDto`.

#### Scenario: Author uploads a photo for their review

- **WHEN** the review's author sends a valid image to `POST /reviews/:id/foto`
- **THEN** the image is uploaded with `folder: 'reviews'`, `publicId: <review.id>`, overwrite enabled
- **AND** the returned URL is saved on `fotoUrl` and the updated review is returned

#### Scenario: Re-uploading replaces the previous asset

- **WHEN** the author uploads a new image for a review that already has one
- **THEN** the same Cloudinary asset (`publicId: <review.id>`) is overwritten and `fotoUrl` is updated, leaving no orphaned asset

#### Scenario: Review does not exist

- **WHEN** the request targets an id that does not exist
- **THEN** the system responds 404 Not Found and uploads nothing

#### Scenario: Invalid file type or size

- **WHEN** the `file` is not jpeg/png/webp, or exceeds 5 MB
- **THEN** the system rejects the request (415 for type, 400 for size) and uploads nothing

### Requirement: Restrict review photo upload to the author

Uploading a review photo SHALL be allowed only for the review's author. Any other
authenticated user SHALL be rejected with 403 Forbidden, and an unauthenticated
request with 401 Unauthorized.

#### Scenario: Non-author attempts the upload

- **WHEN** an authenticated user who is not the review's author attempts the upload
- **THEN** the system responds 403 Forbidden and uploads nothing

#### Scenario: Unauthenticated request

- **WHEN** a request without a valid JWT hits the endpoint
- **THEN** the system responds 401 Unauthorized
