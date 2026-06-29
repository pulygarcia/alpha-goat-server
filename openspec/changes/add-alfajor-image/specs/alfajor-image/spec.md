## ADDED Requirements

### Requirement: Upload an alfajor photo

The system SHALL expose `POST /alfajores/:id/imagen` accepting a
`multipart/form-data` request with a `file` field, protected by `JwtAuthGuard`.
The file MUST be validated as `jpeg`, `png`, or `webp` and at most 5 MB. On
success the system SHALL upload the image to Cloudinary under folder `alfajores`
with `publicId` equal to the alfajor id and overwrite enabled, persist the
returned URL on the alfajor's `imagenUrl`, and respond with the updated
`AlfajorResponseDto`.

#### Scenario: Owner uploads a photo for a pending alfajor

- **WHEN** the alfajor's creator sends a valid image to `POST /alfajores/:id/imagen` and the alfajor is `PENDING`
- **THEN** the image is uploaded with `folder: 'alfajores'`, `publicId: <alfajor.id>`, overwrite enabled
- **AND** the returned URL is saved on `imagenUrl` and the updated alfajor is returned

#### Scenario: Admin uploads a photo for any alfajor

- **WHEN** an admin sends a valid image to `POST /alfajores/:id/imagen`
- **THEN** the upload succeeds regardless of the alfajor's status or who created it

#### Scenario: Re-uploading replaces the previous asset

- **WHEN** an authorized user uploads a new image for an alfajor that already has one
- **THEN** the same Cloudinary asset (`publicId: <alfajor.id>`) is overwritten and `imagenUrl` is updated, leaving no orphaned asset

#### Scenario: Alfajor does not exist

- **WHEN** the request targets an id that does not exist
- **THEN** the system responds 404 Not Found and uploads nothing

#### Scenario: Invalid file type or size

- **WHEN** the `file` is not jpeg/png/webp, or exceeds 5 MB
- **THEN** the system rejects the request (415 for type, 400 for size) and uploads nothing

### Requirement: Restrict who can upload an alfajor photo

Uploading an alfajor photo SHALL follow the same authorization rule as editing
an alfajor: an admin MAY upload for any alfajor; the creator MAY upload only
while the alfajor is `PENDING`. Any other actor SHALL be rejected with 403
Forbidden.

#### Scenario: Non-owner who is not admin

- **WHEN** an authenticated user who is neither the creator nor an admin attempts the upload
- **THEN** the system responds 403 Forbidden and uploads nothing

#### Scenario: Owner of an already-approved alfajor

- **WHEN** the creator attempts to upload for their alfajor that is `APPROVED` (or `REJECTED`)
- **THEN** the system responds 403 Forbidden and uploads nothing

#### Scenario: Unauthenticated request

- **WHEN** a request without a valid JWT hits the endpoint
- **THEN** the system responds 401 Unauthorized
