# SafeTogether

SafeTogether is an emergency information and community-assistance product. Its public resident experience is planned as a React Native mobile app built with Expo for iOS and Android. The authority experience remains a responsive web dashboard.

The current static browser prototype is the interaction and visual reference while the mobile application, backend, and cross-device synchronization are introduced.

## Project structure

```text
SafeTogether/
├── index.html             # Static app entry point
├── mobile/                 # Planned Expo / React Native public application
│   ├── app/                # Map, Report, Offer Help, Guides, Settings
│   ├── components/         # Reusable native interface components
│   ├── services/           # API, location, offline queue, notifications
│   └── storage/            # Local cache and queued action handling
├── web/                    # Planned authority web dashboard
├── shared/                 # Planned shared API models and validation
├── src/
│   ├── app.js              # Current browser-prototype entry point
│   ├── styles.css          # CSS entry point importing feature styles
│   ├── public/             # Map, forms, guides, feature events, and styles
│   ├── authority/          # Dashboard, authority events, and styles
│   └── shared/             # Shared state, common data, UI, events, and styles
├── docs/
│   ├── collaboration.md    # Contributor onboarding and ownership
│   ├── implementation-plan.md # Suggested team delivery plan
│   └── mobile-app.md       # React Native mobile-app architecture
└── README.md
```

The planned target architecture uses Expo / React Native for the public mobile experience, a web application for authorities, and a backend API shared by both. The existing `src/` application remains a browser prototype and reference until the mobile app replaces it.

## Run locally

The current browser prototype can be served locally with any static file server, then opened through its `index.html` page. For example:

```sh
python3 -m http.server 4173
```

The current prototype has no package manager, build step, backend, or configured test suite. Reports, offers, notices, and checklist selections are stored in browser local storage on the current device. The React Native app has not been scaffolded yet, so it cannot currently be run on a phone as an installed mobile app.

For collaborator onboarding and file ownership, see [docs/collaboration.md](docs/collaboration.md).
For the suggested feature roadmap and workstream plan, see [docs/implementation-plan.md](docs/implementation-plan.md).
For the planned Expo / React Native architecture, see [docs/mobile-app.md](docs/mobile-app.md).

## Important limitations

- All map markers, incident records, and the initial official notice are demonstration data; there is no live map, geolocation, alert feed, or emergency-services connection.
- Reports, offers, and notices are not sent to another person or published online. A demo report will appear in the local authority review queue only.
- The authority view has no authentication or server-side authorization. It must not be used for real operations.
- Emergency contacts vary by region. The guides provide general safety information and direct users to local official instructions; no authoritative content review process is connected.
