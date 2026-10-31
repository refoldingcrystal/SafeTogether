# SafeTogether contributor onboarding

## Before starting

1. Share the repository link and this README with each collaborator.
2. Ask each person to clone the repository and use their own branch or isolated worktree. Avoid having multiple people edit the same working tree.
3. Have each person run the browser prototype locally with `python3 -m http.server 4173`, then open `http://localhost:4173`. Read `docs/mobile-app.md` before starting React Native work.
4. Ask contributors to inspect `git status --short` before editing and preserve any changes they find.
5. Assign one feature outcome to each person. Ask them to post their ownership and expected touchpoints before they begin.

## Run the native app on a phone

The public mobile app is an Expo project in `mobile/`. Each collaborator should install [Expo Go](https://expo.dev/go) on their iOS or Android phone, then install the project dependencies once and start Expo:

```sh
cd mobile
npm install
npx expo start
```

Keep the phone and development computer on the same Wi-Fi network. When Expo displays its QR code, scan it with Expo Go on Android, or with the iPhone Camera app and then choose Expo Go. The development server must remain running while testing; saved changes normally refresh on the phone automatically.

If the QR code opens but the app cannot connect, confirm that both devices are on the same non-guest network and that the computer firewall permits local-network connections. As a fallback for a network that prevents device-to-device traffic, start Expo with a tunnel (this needs internet access):

```sh
npx expo start --tunnel
```

For an Android phone connected by USB, enable USB debugging and use:

```sh
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d 'exp://127.0.0.1:8081'
```

Expo Go is suitable for the current project. If a future change adds a native module that Expo Go does not include, the team will need an Expo development build instead; record that requirement in the change handoff.

## Suggested feature workstreams

| Collaborator | Feature outcome | First focus | Likely touchpoints |
|---|---|---|---|
| Collaborator 1 | Map panel | Demonstration map, incident markers, official notices, filters, connectivity states, and OpenStreetMap integration | `mobile/src/app/(tabs)/index.tsx`, map components, shared incident and notice data |
| Collaborator 2 | Report panel | Native report form, validation, confirmation, draft preservation, retry states, and report privacy | `mobile/src/app/(tabs)/report.tsx`, shared incident data |
| Collaborator 3 | Offer Help panel | Help-offer form, availability, capacity, offer management, withdrawal, and contact privacy | `mobile/src/app/(tabs)/offer.tsx`, shared help-offer data |
| Collaborator 4 | Guides panel | Guide search, detail screens, checklist, emergency contacts, source metadata, and content governance | `mobile/src/app/(tabs)/guides.tsx`, `mobile/src/app/guide/`, shared guide data |

The prototype is split into feature modules. These workstreams describe outcomes rather than exclusive files: contributors should make the smallest necessary changes across the app, coordinate shared-data changes in advance, and avoid concurrent edits to the same file.

All four panel entry points are present and render on Android: Map, Report, Offer Help, and Guides. The browser prototype remains useful as a reference, but panel work should begin in `mobile/src/app/`.

Expo / React Native is the public-app stack. OpenStreetMap is the intended future map-data direction. The Map-panel workstream should document the selected React Native renderer, tile source, attribution, usage limits, and location-privacy approach before replacing the demonstration map.

## Coordination rules

- Claim the feature outcome, user journey, and expected files in the team channel before editing.
- Coordinate before changing a file another collaborator is actively editing.
- Keep each change focused on the assigned feature and explain shared API or data-model changes.
- Do not reset, overwrite, stash, or discard another contributor's work.
- Do not commit, push, merge, or rebase another person's changes. Each contributor should share a branch or reviewable diff for the team to review and integrate.
- Before integrating a change, check `git status --short` and review the diff.

## Before handing work back

Run the mobile type, lint, and whitespace checks:

```sh
cd mobile
npx tsc --noEmit
npx expo lint
cd ..
git diff --check
```

The browser prototype remains local-only. The Expo mobile app currently uses demonstration data and local component state; reports, offers, notices, and checklist progress are not yet synchronized across devices. In the handoff, list changed files, interactions completed, checks run, and backend or integration gaps.

## Copyable kickoff message

> We’re building SafeTogether as an Expo / React Native public mobile app plus an authority web dashboard. Please read `README.md`, `docs/collaboration.md`, `docs/implementation-plan.md`, and `docs/mobile-app.md`; run the native mobile app; then claim one app panel and its user journey in the team channel before editing. Use your own branch or isolated worktree. Coordinate shared API, map, and data-privacy changes before making them. Keep changes focused, preserve existing work, run the listed checks, and send back your branch/diff with changed files and known limitations. OpenStreetMap is our future map direction; do not replace the demonstration map until renderer, attribution, tile source, and location privacy are agreed.
