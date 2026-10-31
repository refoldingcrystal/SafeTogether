# Mobile shared contracts

`models.ts` defines the records exchanged between the Expo resident app and the future authority web dashboard: incidents, help offers, official notices, guides, audit events, locations, and freshness states.

`demo.ts` and `data/mock.json` contain local demonstration content. `services/api.ts` is the typed HTTP client for the backend; it reads `EXPO_PUBLIC_API_URL`, stores native session tokens with Expo SecureStore, and uses session storage on web. Screens still need to replace their local demo state with calls to this client.

For local development, create `mobile/.env.local` with `EXPO_PUBLIC_API_URL=http://<computer-ip>:8787/v1`. On a phone, use the computer's LAN IP, not `localhost`. Call `api.register` or `api.login` before protected API methods. The backend token lasts seven days and logout clears it from the client.

Public client records must use approximate locations only. Private contact details, exact residential addresses, internal notes, and unapproved attachments must never be added to this module or sent to public mobile screens.
