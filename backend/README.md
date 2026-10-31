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
| `GET /map` | Signed in | One response with public incidents, active notices, evacuation points, visible connections, heat counts, and Help feed |
| `GET /help-feed` | Signed in | UI-shaped list of active help requests and offers |
| `GET /help-requests`, `POST /help-requests`, `PATCH /help-requests/:id` | Signed in | Create, list, update, resolve, or withdraw emergency, event, or resource requests |
| `GET /help-requests/:id/messages`, `POST /help-requests/:id/messages` | Signed in | Join and read a coordination thread; request owner and participants can read it |
| `GET /incidents`, `POST /incidents` | Signed in | Public-safe incident list and report submission |
| `PATCH /incidents/:id` | Authority | Review status and approve attachment IDs |
| `POST /incidents/:id/attachments` | Reporter or authority | Upload base64 image data URL (JPEG, PNG, WebP; 5 MB max) |
| `GET /attachments/:id` | Public if approved; owner or authority for pending | Read approved incident or active-offer photo |
| `GET /offers`, `POST /offers`, `PATCH /offers/:id` | Signed in | Create, list, edit, and withdraw aid offers |
| `POST /offers/:id/attachments` | Offer owner or authority | Upload up to 5 MB JPEG, PNG, or WebP photos for an offer |
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

The Help offer contract follows the current mobile UI: `categories` is a list selected from Shelter, Food and water, Transport, Qualified first aid, Supplies, or Other practical help. `description` and `approximateLocation` are optional. Offers may have up to three photos; uploads are private until an authority approves them. `PATCH /offers/:id` accepts updated `categories`, `description`, `approximateLocation`, and `status: "withdrawn"`, matching the Help screen's edit and stop actions.

Help requests accept `kind: "resource" | "emergency" | "event"`, optional `title`, `categories`, `tags`, `description`, and approximate location. Resource requests and offers are combined by `GET /help-feed` into the mobile card shape (`type`, `title`, `author`, `distance`, `tags`, `description`, `photos`, and `isMine`). A first message on an active request joins the sender to that thread; the requester and joined participants can then retrieve its messages. The API stores messages but does not deliver push notifications or provide a real-time transport, so clients must poll the thread.

Examples for the Help screen:

```json
{ "categories": ["Shelter", "Food and water"], "description": "Room for two people tonight.", "approximateLocation": "Riverside district" }
```

```json
{ "kind": "Request resources", "categories": ["Food or water"], "description": "Drinking water for a family of four.", "approximateLocation": "Central district" }
```

To coordinate on a request, post `{ "text": "I can bring water to the north entrance. Is that safe?" }` to `/help-requests/:id/messages`, then poll that route with `GET` while the chat is open. The offer photo upload accepts `{ "data": "data:image/jpeg;base64,..." }` at `/offers/:id/attachments`.

## Current limits

This is a development backend, not a deployable emergency-response service. A typed mobile API client now exists, but screens still use demonstration state and must be wired to it; there is no sign-in interface yet. The JSON file store is suitable only for a single process and modest local use; it has no database transactions, multi-instance coordination, disaster recovery, or operational monitoring. Tokens are bearer credentials with a seven-day lifetime and there is no refresh/revocation flow, MFA, account recovery, rate limiting, or abuse moderation workflow. The audit log is append-only at the API level, but stored in the same mutable JSON file. Public clients should treat incident and offer content as untrusted. Do not use this service for real evacuations until it has undergone security, privacy, reliability, legal, and authority workflow review and uses a managed database/object store.
