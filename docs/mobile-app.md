# Public mobile app architecture

## Product boundary

The public SafeTogether experience will be a React Native application built with Expo and released for iOS and Android. It covers the resident-facing journeys:

- Nearby incidents and official notices on a map.
- A map-based Need help action.
- Community help offers.
- Information and safety guides.
- Preparedness checklist and accessibility preferences.

The authorities dashboard remains a web experience. Both clients will use the same backend API, record models, and public/private data rules.

## Planned structure

```text
mobile/
├── app/                    # Expo Router screens and navigation
│   ├── (tabs)/              # Map, Mesh, Help, Guides
│   ├── guide/               # Individual safety-guide screens
│   ├── incident/            # Public incident details
│   └── settings/            # Privacy, location, notifications, accessibility
├── components/              # Buttons, fields, badges, cards, loading states
├── features/                # Feature-specific presentation and logic
│   ├── incidents/
│   ├── help-offers/
│   ├── guides/
│   └── settings/
├── services/                # API, map, geolocation, notifications, uploads
├── storage/                 # Cached guides, sync metadata, offline action queue
├── theme/                   # Shared native tokens and accessibility settings
└── tests/
```

The current browser prototype under `src/` is not the mobile app source. Use it as a visual and interaction reference while rebuilding screens with native React Native components.

## Navigation

Use a four-tab public navigation model:

1. Map
2. Mesh
3. Help (neighbour feed and the Offer Help flow)
4. Guides

The Need help action belongs on the map rather than as a separate tab. Settings should be reached from the map header or a profile area so it does not displace primary actions from the navigation.

## Maps and location

OpenStreetMap is the intended map-data direction. Before implementation, the maps workstream must document:

- The React Native map renderer.
- The tile provider and its service terms, usage limits, and cost model.
- Required OpenStreetMap and tile-provider attribution.
- The public location precision rule.
- The behavior for denied permission, no signal, cached content, offline use, and map-load failure.

The public map must show approximate locations only. Exact locations, internal notes, private contact details, and unapproved attachments must never be placed in the mobile client’s public map data.

## Device capabilities

| Capability | Intended use | Rule before enabling |
|---|---|---|
| Location | Center the map and support a user-initiated Need help action | Ask only after a user action; never imply location is live when it is cached or unavailable |
| Notifications | Opt-in official notices | Target by approved region, support unsubscribe, and distinguish official notices from community reports |
| Local storage | Checklist, cached guides, sync time, queued actions | Do not store sensitive private data without an approved security design |

## Offline behavior

The mobile app should cache safety guides and the last synchronized public map data. It should show:

- Live information.
- Last synchronization time.
- Cached or outdated information.
- Queued help-offer actions.
- Actions unavailable while offline.

Do not label cached content as live. A queued action must make clear that it has not been received by another person or authorities yet.

## Shared API boundary

The mobile app now defines its initial typed contract in `mobile/src/shared/models.ts`: incidents, help offers, official notices, guides, and audit events. The current mock-data boundary is `mobile/src/shared/demo.ts`. The future API must provide separate public and authority representations so internal fields cannot reach the public client.

## First mobile milestone

The first Expo milestone should be demonstrable on a physical phone and include:

1. Four-tab native navigation: Map, Mesh, Help, and Guides.
2. Mobile map placeholder with explicit demonstration status.
3. Map-based Need help action with clear demonstration status and cancellation.
4. Mesh status screen with clear demonstration and offline/queued states.
5. Help feed and offer-help flow with clear demonstration status.
6. Guides list, search, guide details, and checklist persistence.
7. A shared mock API layer that mirrors the agreed backend contract.

After that milestone, add backend synchronization, OpenStreetMap rendering, location permission, authenticated offer management, and official-notice notifications.
