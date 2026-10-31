# SafeTogether API

Node.js 20+ REST API for the resident and authority clients. It uses only Node built-ins and stores JSON records and private image files under `backend/data/` (override with `SAFETOGETHER_DATA_DIR`). Keep that directory on a persistent, access-controlled disk and back it up securely.

## Run

```powershell
cd backend
$env:SAFETOGETHER_SECRET = "replace-with-a-long-random-secret"
$env:SAFETOGETHER_AUTHORITY_EMAIL = "operator@example.org"
$env:SAFETOGETHER_AUTHORITY_PASSWORD = "use-a-unique-password-of-10-or-more-characters"
npm start
```

The authority account is created on first startup only when both authority variables are set and that email is not already registered. Resident registration cannot choose a role. Use HTTPS through a trusted reverse proxy outside local development. Set `CORS_ORIGIN` to the exact client origin in production. Without a stable `SAFETOGETHER_SECRET`, sessions will stop working after a restart.

Base URL: `http://localhost:8787/v1`. Send JSON with `Content-Type: application/json`; authenticated routes require `Authorization: Bearer <token>`. All timestamps are UTC ISO 8601.

## Routes

| Method and route | Access | Purpose |
| --- | --- | --- |
| `GET /health` | Public | Liveness check |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Public / signed in | Account and token management |
| `GET /incidents`, `POST /incidents` | Signed in | Public-safe incident list and report submission |
| `PATCH /incidents/:id` | Authority | Review status and approve attachment IDs |
| `POST /incidents/:id/attachments` | Reporter or authority | Upload base64 image data URL (JPEG, PNG, WebP; 5 MB max) |
| `GET /attachments/:id` | Signed in | Approved image; authority can review pending images |
| `GET /offers`, `POST /offers`, `PATCH /offers/:id` | Signed in | Create, list, withdraw aid offers |
| `GET /notices` | Signed in | Published official notices |
| `POST /notices`, `PATCH /notices/:id` | Authority | Draft, publish, update, withdraw notices |
| `GET /rendezvous` | Signed in | Active evacuation rendezvous points |
| `POST /rendezvous`, `PATCH /rendezvous/:id` | Authority | Publish or withdraw a point |
| `PUT /location`, `DELETE /location`, `GET /locations` | Signed in | Set/remove location and retrieve locations visible to viewer |
| `GET /connections`, `POST /connections`, `PATCH /connections/:id` | Signed in | Request, accept, and list connections (request by account email) |
| `GET /heatmap` | Signed in | Aggregated verified/in-progress incident counts by approximate area |
| `GET /authority/incidents`, `GET /authority/audit` | Authority | Full review queue and audit events |

Example report:

```json
{
  "category": "Medical emergency",
  "description": "An injured person needs assistance near the station entrance.",
  "approximateLocation": { "label": "Central station", "precision": "landmark", "latitude": 52.23, "longitude": 21.01 },
  "shareWithAuthorities": true
}
```

Location visibility accepts `private`, `connections`, `connections_authorities`, or `everyone`. Coordinates are rounded to two decimal places before storage and responses. User locations are returned only when the viewer matches that policy. Public incident listing removes reporter identifiers and only includes approved photos for verified incidents. Photo bytes are checked against their declared image format; pending photos are not publicly retrievable.

## Current limits

This is a development backend, not a deployable emergency-response service. The JSON file store is suitable only for a single process and modest local use; it has no database transactions, multi-instance coordination, disaster recovery, or operational monitoring. Tokens are bearer credentials with a seven-day lifetime and there is no refresh/revocation flow, MFA, account recovery, rate limiting, or abuse moderation workflow. The audit log is append-only at the API level, but stored in the same mutable JSON file. Public clients should treat incident and offer content as untrusted. Do not use this service for real evacuations until it has undergone security, privacy, reliability, legal, and authority workflow review and uses a managed database/object store.
