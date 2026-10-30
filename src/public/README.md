# Current public-prototype modules

The public product is moving to React Native with Expo. These browser modules remain the interaction and visual reference until equivalent native screens are delivered under the planned `mobile/` application.

- Map: `map.js`, `map-events.js`, `map.css`
- Report and offer-help: `forms.js`, `forms-events.js`, `forms.css`
- Information & Guides: `guides.js`, `guides-events.js`, `guides-data.js`, `guides.css`

Feature modules use shared state and UI helpers from `../shared/`. Keep unrelated feature work in its own module files. Follow `docs/mobile-app.md` for the target native architecture.
