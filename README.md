# SafeTogether

SafeTogether is a dependency-free, frontend-only product prototype for a community emergency information service.

## Project structure

```text
SafeTogether/
├── index.html             # Static app entry point
├── src/
│   ├── app.js              # App entry point and route rendering
│   ├── styles.css          # CSS entry point importing feature styles
│   ├── public/             # Map, forms, guides, feature events, and styles
│   ├── authority/          # Dashboard, authority events, and styles
│   └── shared/             # Shared state, common data, UI, events, and styles
├── docs/
│   └── collaboration.md    # Contributor onboarding and ownership
└── README.md
```

Public and authority views now live in separate feature modules. `src/app.js` connects route rendering and event setup. Shared state and reusable UI live under `src/shared/`. Each feature has its own stylesheet, imported by `src/styles.css`.

## Run locally

Serve this directory with any static file server, then open its `index.html` page. For example:

```sh
python3 -m http.server 4173
```

The prototype has no package manager, build step, backend, or configured test suite. Reports, offers, notices, and checklist selections are stored in the browser's local storage on the current device. The dashboard shares that local demo state with the public screens.

For collaborator onboarding and file ownership, see [docs/collaboration.md](docs/collaboration.md).

## Important limitations

- All map markers, incident records, and the initial official notice are demonstration data; there is no live map, geolocation, alert feed, or emergency-services connection.
- Reports, offers, and notices are not sent to another person or published online. A demo report will appear in the local authority review queue only.
- The authority view has no authentication or server-side authorization. It must not be used for real operations.
- Emergency contacts vary by region. The guides provide general safety information and direct users to local official instructions; no authoritative content review process is connected.
