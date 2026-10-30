# Browser-prototype shared modules

- `state.js`: local demo application state and persistence.
- `data.js`: shared report and offer categories plus demonstration report records.
- `ui.js`: shared page heading, navigation, header, report row, escaping, and toast helpers.
- `events.js`: shared navigation and generic map control events.
- `base.css`: app-wide design tokens, layout, and shared elements.

These JavaScript files serve only the current browser prototype. The typed shared contract for the Expo mobile application lives in `mobile/src/shared/`; it is the starting point for the future API shared with the authority web dashboard.

Do not add private contact details, exact residential addresses, internal review notes, or unapproved attachments to either shared-data boundary.
