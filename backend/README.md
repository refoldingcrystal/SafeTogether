# SafeTogether API

Node.js 20+ REST API for the resident and authority clients. It uses only Node built-ins and stores JSON records and private image files under `backend/data/` (override with `SAFETOGETHER_DATA_DIR`). Keep that directory on a persistent, access-controlled disk and back it up securely.

## Run

```powershell
cd backend
$env:SAFETOGETHER_SECRET = "replace-with-a-long-random-secret"
$env:SAFETOGETHER_AUTHORITY_ID = "ST-set-a-private-random-id-and-keep-it"
npm start
```

The authority account is created on first startup when `SAFETOGETHER_AUTHORITY_ID` is set and that ID has not already been provisioned. Keep the same authority ID and `SAFETOGETHER_SECRET` across restarts. Resident registration cannot choose a role. Use HTTPS through a trusted reverse proxy outside local development. Set `CORS_ORIGIN` to the exact client origin in production. Without a stable `SAFETOGETHER_SECRET`, sessions will stop working after a restart.

Base URL: `http://localhost:8787/v1`. Send JSON with `Content-Type: application/json`; authenticated routes require `Authorization: Bearer <token>`. All timestamps are UTC ISO 8601.

## Connect the mobile app

Create `mobile/.env.local` with `EXPO_PUBLIC_API_URL`. For Expo Go on a phone, use the computer's LAN address instead of `localhost`, for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:8787/v1`. Keep the phone and computer on the same network, allow inbound connections to port 8787, and restart Expo after changing the file. Open the account icon on the map and enter an ID. If it has not been used before, signing in creates the resident account. Use the exact same ID next time; a typo creates a different account. Keep the ID private because it grants account access. Restart the backend after pulling server changes. When signed in, the app loads `GET /map`, and the help form writes emergency/event reports to `POST /incidents` and resource requests to `POST /help-requests`. If the API is unreachable or the user is signed out, the map keeps its built-in demonstration data; request submission displays the API error instead of silently pretending it was sent.

## Routes

| Method and route | Access | Purpose |
| --- | --- | --- |
| `GET /health` | Public | Liveness check |
| `POST /auth/id/login`, `GET /auth/me` | Public / signed in | Sign in with an ID; an unknown ID creates a resident account |
| `POST /auth/register`, `POST /auth/login` | Public | Legacy email/password account compatibility |
| `GET /map` | Signed in | One response with public incidents, notices, rendezvous points, active danger zones and emergency sites, visible connections, heat counts, and Help feed |
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
| `GET /emergency-sites` | Signed in | Active shelters, safe zones, and aid points for map and route planning |
| `POST /emergency-sites`, `PATCH /emergency-sites/:id` | Authority | Publish or deactivate an emergency site |
| `GET /danger-zones` | Signed in | Active hazard overlays for the map and safe-route planner |
| `POST /danger-zones`, `PATCH /danger-zones/:id` | Authority | Publish, expire, or withdraw a hazard area |
| `PUT /location`, `DELETE /location`, `GET /locations` | Signed in | Set/remove location and retrieve locations visible to viewer |
| `GET /connections`, `POST /connections`, `PATCH /connections/:id` | Signed in | Request, accept, and list connections (request by public account ID; legacy email accepted) |
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

ID-based login stores the entered ID on the user record and uses it as the user's display name. A new ID creates a resident account; entering a different or misspelled ID creates a separate account. The ID is stored in plaintext in `backend/data/store.json`. Since the display name appears on public Help offers and connection records, this also exposes the sign-in ID to other users, who can then access that account. Use this only with IDs intended to be public; a safer design keeps a private sign-in credential separate from the public display name. The public account ID (`usr_…`) is different and can be shared to request a connection; it cannot be used to sign in. IDs created by the earlier hash-only version are migrated to plaintext on the next successful sign-in.

Emergency-site records accept `kind: "shelter" | "safe_zone" | "aid"`, `title`, `summary`, `coordinate: { "latitude": 52.202, "longitude": 20.955 }`, and optional `capacity` and `expiresAt`. Danger zones accept `kind: "attack" | "fire" | "flooding"`, `title`, `summary`, `coordinate`, `radius` in meters, `severity: "critical" | "high" | "medium"`, and optional `expiresAt`. Only authority accounts can publish or deactivate these records. Their coordinates retain five decimal places; resident-reported locations continue to be rounded to two decimals.

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

This is a development backend, not a deployable emergency-response service. The mobile map, Help feed, offer editor, request form, and coordination chat use the API when signed in and retain demonstration data when the API is unavailable. Mesh transport remains simulated and local. The JSON file store is suitable only for a single process and modest local use; it has no database transactions, multi-instance coordination, disaster recovery, or operational monitoring. Tokens are bearer credentials with a seven-day lifetime and there is no refresh/revocation flow, MFA, account recovery, rate limiting, or abuse moderation workflow. The audit log is append-only at the API level, but stored in the same mutable JSON file. Public clients should treat incident and offer content as untrusted. Do not use this service for real evacuations until it has undergone security, privacy, reliability, legal, and authority workflow review and uses a managed database/object store.
