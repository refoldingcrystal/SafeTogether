# Mesh transport proposal (for team review)

Owner: Collaborator 3 (Mesh panel). Status: **draft — no native transport is implemented yet.**

This proposes how SafeTogether could pass messages phone-to-phone when there is no internet. Nothing here should be built until the team agrees on it.

## What the mesh is for

Small, store-and-forward messages only:

- SOS (category, approximate location, time)
- "I am safe" updates
- Short emergency reports

Not for: photos, chat, live location tracking, or anything that needs a reply within seconds. Delivery can take minutes to hours and may never happen; the UI must always say so.

## What the mesh can and cannot show

| | Possible? | How |
|---|---|---|
| Short structured messages | Yes | A few hundred bytes each; hops of roughly 10–100 m |
| Location in a message | Yes | GPS works without internet; send approximate coordinates only |
| Messages on a map | Only with a saved map | Map tiles cannot travel over Bluetooth. Cache the local area while online, then pin mesh messages on it. Otherwise show distance and direction |
| Who is nearby | Partly | Count of SafeTogether phones and rough signal strength ("very close / nearby"), not exact positions |
| Family nearby | If paired earlier | Phones connected while online can recognise each other; strangers stay anonymous |
| Verified official notices | Yes | Authority messages are signed; phones verify the signature offline with preloaded public keys |
| Photos, voice, video, instant chat | No | Too large and slow; delivery can take minutes or hours |

## Message types

Structured templates instead of free chat: smaller, easier to translate, and harder to spam. Free text is capped at 140 characters.

| Type | Content | Suggested expiry |
|---|---|---|
| SOS | Category, approximate location, time | Until "I am safe" |
| I am safe | Sender, time | 24 h |
| Shelter offer | Capacity, approximate location, open until | 12 h |
| Need help | Food and water / first aid / transport / supplies, short note | 6 h |
| Danger warning | Short description, approximate location | 6 h |
| Message to family | Short text, encrypted for paired family only | 24 h |
| Official notice | Signed by an authority | Set by the authority |

Received messages show sender (or "Anonymous"), Verified / Unverified, distance and direction, number of hops, received time and expiry.

## Options considered

| Option | Platforms | Pros | Cons |
|---|---|---|---|
| **Bluetooth Low Energy (BLE), our own protocol** | iOS + Android, cross-platform | Works between iPhone and Android; low power; full control | Most work; small payloads; severe iOS background limits |
| Apple Multipeer Connectivity | iOS only | Simple API, Wi-Fi + Bluetooth | Does not talk to Android |
| Google Nearby Connections | Android only (in practice) | Higher bandwidth, handles discovery | Does not talk to iPhones |
| Commercial mesh SDK (e.g. Bridgefy) | iOS + Android | Mesh, relay and encryption already built | Licence cost, vendor dependency, closed code in a safety-critical path |

**Recommendation:** start with a small evaluation of a commercial SDK against a minimal BLE prototype, then choose. Cross-platform (iPhone ↔ Android) is a hard requirement, which rules out Multipeer and Nearby on their own.

## How it would work (BLE option)

1. **Advertise** a SafeTogether service ID while offline, with a rotating random device ID (no name, no phone number).
2. **Discover** nearby phones advertising the same service.
3. **Exchange** message IDs first, then only the messages the other phone does not have yet.
4. **Store and forward:** each phone keeps a copy and passes it on later, with a hop limit and an expiry time.
5. **Deliver** when any phone carrying the message gets internet and uploads it to the backend; the backend de-duplicates by message ID.
6. **Receipt:** only a receipt signed by the backend may change a message to "delivered". A hop to another phone is only ever "passed on".

## Security and privacy

- **Encrypt the content** for the backend's public key so relaying phones cannot read it. Until this exists, the app says messages are not encrypted.
- **Sign messages** so relays cannot change them, and so fake SOS floods can be filtered.
- **Rotating IDs** so a phone cannot be tracked over time by its Bluetooth ID.
- **Radio visibility:** in a conflict zone, Bluetooth advertising itself can reveal that people are present. Users need a clear way to turn the mesh off, and the default should be agreed with the team.
- **Location:** an SOS carries approximate location only, never exact coordinates or contacts.

## Permissions

- **Android 12+:** `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT`. Declare scan as not used for location where possible. Older Android versions need location permission for scanning.
- **iOS:** `NSBluetoothAlwaysUsageDescription` with a plain explanation.
- Ask only when the user first needs the mesh, not at app start, and explain why first.
- Configure all of this through `app.json` / config plugins (no hand-edited `ios/` or `android/` folders).

## Platform limits and battery

- **iOS in the background** can still scan and advertise, but much more slowly, and only for apps that look for our specific service ID. Two locked iPhones may take a long time to find each other. Relaying works best with the app open.
- **Android** may stop background work to save battery, depending on the manufacturer. A foreground service with a visible notification is the reliable option.
- **Battery:** scan in short bursts (for example a few seconds every minute) rather than continuously, and stop when internet returns or battery is low.
- **Expo:** any of these needs a development build. It will not run in Expo Go.

## What the app already does (this sprint)

- The Mesh tab shows one clear state: standby, looking for phones, passed on, or unavailable.
- A real outage shows **unavailable**, because no transport exists yet. Only the presenter simulation shows relaying.
- Queued messages are listed with "not sent" or "passed on · delivery not confirmed". Nothing says "delivered".
- Last successful server sync is shown, and is "never" until a backend exists.
- A **Mesh on/off switch** at the top of the tab. Off stops all scanning, advertising, relaying and the finder; messages wait on the phone. In a real build this must stop the app's Bluetooth advertising and scanning. The app cannot switch off the phone's Bluetooth on iOS, so for full silence users still need to turn Bluetooth off in system settings.
- The earlier radar animation was removed: Bluetooth cannot tell where nearby phones are, only that they are near. The tab shows a plain count and rough closeness for paired family instead.
- **Send over mesh** panel with the six message types above (added to the queue, never shown as sent).
- **Received nearby** feed (simulated) with verified/unverified labels, distance, hops and expiry; shelter and evacuation messages open on the map.
- **Nearby** section (simulated): anonymous phone count and paired family members in range.
- Every sent message carries a location (fixed demo position until GPS is wired in) and shows how many phones have seen it.
- **I can help** on a nearby SOS or request sends a "coming to help" reply and opens a **finder** that shows Far / Nearby / Close / Very close, as Bluetooth signal strength would. Exact metres are not reliable over Bluetooth, so bands are shown.
- After your own SOS is passed on, a simulated neighbour replies "coming to help you".

## Helping someone find you

1. The SOS carries GPS coordinates (works offline). Accuracy is a few metres outdoors, worse indoors or under rubble.
2. Helpers see it in Nearby with distance and direction, and on the map if offline maps exist.
3. Within roughly 30–50 m, signal strength (RSSI) from the SOS phone guides the helper "hot / cold". It is noisy, so show bands, not metres.
4. A helper's "I can help" reply travels back over the mesh so the sender knows someone is coming.
5. When any carrying phone gets internet, the SOS reaches the backend and the authority dashboard.

## Open questions for the team

1. Commercial SDK or our own BLE protocol?
2. Mesh on by default when offline, or opt-in, given the radio-visibility risk?
3. Which backend key, and who operates it, for encrypting messages?
4. Hop limit and expiry time for messages?
5. Should the queue survive an app restart before the backend exists? (Needs an approved local-storage design.)
