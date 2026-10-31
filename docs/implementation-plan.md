# SafeTogether implementation plan

This plan turns the current local prototype into a product foundation without having several people change the same files. It assumes five collaborators working by product feature rather than fixed file ownership.

## First team decision

Before coding product features, agree on one backend approach and record it in an issue or team message. The current app has no package manager, server, database, authentication, or API.

The public-app stack is React Native with Expo. Introduce a backend and database in a separate backend folder or repository, with documented API contracts used by the Expo mobile app and the authority web dashboard. OpenStreetMap is the intended map-data direction; agree on the React Native renderer, tile source, attribution, usage limits, privacy approach, and deployment budget before integration. Do not add file upload, push, or authentication providers until the team has agreed on privacy, cost, and deployment requirements.

Until that decision is made, contributors should keep work local and use the existing demo state. Do not present any demo workflow as live emergency coordination.

## Shared delivery order

| Phase | Outcome | Dependency |
|---|---|---|
| 0. Foundation | Agreed data model, API contract, environments, and ownership | Team agreement |
| 1. Mobile foundation | Expo navigation, native public workflows, guides, and shared mock API models | Phase 0 contract |
| 2. Backend integration | Persistent reports, offers, notices, roles, and audit events across mobile and web | Backend and authentication |
| 3. Location and safety | Real map, approximate locations, consent, loading/error/offline states | Location privacy rules |
| 4. Operations | Incident review, notices, resources, audit history | Roles and backend integration |
| 5. Reliability | Tests, accessibility checks, monitoring, deployment | Stable workflows |

## Phase 0 — shared foundation work

Create and agree on these interfaces before feature work depends on them:

```text
Incident: id, category, description, approximateLocation, submittedAt,
          source, verificationStatus, incidentStatus, updatedAt

HelpOffer: id, category, description, approximateLocation, availability,
           capacity, contactPolicy, status, createdAt, expiresAt

OfficialNotice: id, title, body, status, publishedAt, expiresAt, authorId

Guide: id, title, category, summary, steps, warnings, reviewedAt, sourceUrl

AuditEvent: id, action, actorId, targetType, targetId, createdAt
```

Define public visibility separately from internal data. Public records must never contain a residential address, private contact details, attachments without authorization, or internal review notes.

Suggested shared tasks:

- The five collaborators agree on the backend, database, deployment environment, and authentication provider.
- Agree on the API contract, public/private field rules, native navigation, and mobile lint, test, and build commands before a panel depends on them.
- Any shared-state, route, or design-system change gets team review before integration.

Definition of done: feature owners can build against a stable record shape and know which data is public, private, queued, stale, or live.

## Phase 1 — feature workstreams that can start now

### Collaborator 1 — Map panel

First sprint:

1. Improve incident-marker selection, marker status labels, and map legend behavior.
2. Add category and status filters with a useful empty state.
3. Add official-notice entry points and links to relevant safety guides.
4. Define the OpenStreetMap renderer, tile source, attribution, and usage limits for team review.
5. Add explicit demonstration, loading, failed, cached, and location-permission-denied states.

Next after backend integration:

- Replace the illustration with the approved OpenStreetMap renderer and tile source.
- Request location only after a user action and round public location data before display.
- Load official notices and approved public incidents from the API.
- Cache the last synchronized public map state and show its age.

Handoff: state the map data source, attribution requirements, privacy decisions, UI states added, and API assumptions.

### Collaborator 2 — Report panel

First sprint:

1. Separate report validation rules by incident category.
2. Add explicit loading, success, retry, and duplicate-submission states.
3. Preserve entered details after a failed submission.
4. Add a clear report reference and queued/offline confirmation state.
5. Keep privacy and local-emergency-service guidance visible throughout the flow.

Next after backend integration:

- Replace local demonstration submissions with API calls.
- Add server-returned report references and safe retry behavior.
- Add optional attachment metadata only after secure upload handling is designed.

Handoff: list validation behavior, submission states, privacy decisions, API assumptions, and changed files.

### Collaborator 3 — Mesh panel

First sprint:

1. Make online, offline, standby, discovery, relaying, and unavailable states unambiguous.
2. Show what is queued, what has not been sent, and when the last successful synchronization occurred.
3. Provide accessible status text and a non-animated fallback for the mesh visualization.
4. Keep Bluetooth, peer identity, and location/privacy language explicit; do not imply a message was delivered when it is only queued.
5. Document the proposed native transport, permissions, battery impact, and platform limitations for team review before adding a real peer-to-peer implementation.

Next after the connectivity design is approved:

- Integrate the approved native transport and permission flow.
- Persist and safely retry queued actions without duplicating reports or offers.
- Add test coverage for transport loss, relay failure, and return-to-internet synchronization.

Handoff: list the states and claims shown to users, accessibility behavior, privacy decisions, transport assumptions, and changed files.

### Collaborator 4 — Help panel

First sprint:

1. Add useful feed filtering, empty, loading, stale, and offline states for neighbour requests and offers.
2. Add availability, capacity, expiry, and clear offer-status states.
3. Add a local “my offers” list with edit and withdraw actions, clearly marked as demonstration-only.
4. Add publish loading, success, retry, and duplicate-submission protection.
5. Make private contact handling explicit and keep it outside public listing data.
6. Keep medical-help language limited to actual verified qualifications.

Next after authentication and backend integration:

- Add authenticated offer ownership, editing, and withdrawal.
- Persist offers through the API with expiration and moderation states.
- Add safe private contact-request handling without exposing contact details publicly.

Handoff: list feed and offer states, privacy decisions, API assumptions, and changed files.

### Collaborator 5 — Guides panel

First sprint:

1. Improve guide search, category filtering, related guides, and empty states.
2. Add review dates, source placeholders, and guidance governance metadata.
3. Add a configurable emergency-contacts panel that does not assume one country’s emergency number.
4. Persist checklist progress locally and state that limitation clearly.
5. Review guide language for clarity, general-safety framing, and official-instructions priority.

Next after content governance exists:

- Load published guides from the API.
- Add language support, revision history, reviewer identity, source links, and regional contact configuration.

Handoff: list changed guide content, sources still needed, configuration assumptions, and changes made.

## Phase 2 — integration checkpoint

The team integrates work only after the shared model is agreed. Verify this journey end to end:

1. A public report is submitted and receives a reference.
2. It enters the authority review queue as `Awaiting review`.
3. An authority user changes its review state.
4. The public map and incident detail reflect only approved public information.
5. An authority user publishes an official notice.
6. The public map presents that notice as official, distinct from community reports.

Add a similar test path for a help offer: create, browse approximate information, withdraw, and ensure private contact details remain unavailable publicly.

The authority dashboard is a shared integration workstream after these five panels use the agreed incident, help-offer, notice, audit-event, and connectivity contracts. Build its incident review, official notices, internal notes, resource workflow, and audit history without assigning public-panel work to it.

## Phase 3 — map, connectivity, and notifications

Do this only after location privacy rules are agreed.

- Use the agreed OpenStreetMap renderer and tile source with accessible keyboard controls and visible attribution.
- Request location permission only when the user asks to use it.
- Round or otherwise approximate public locations before publishing them.
- Display live, last-synced, cached, offline, loading, and failed states clearly.
- Cache guides and the last safe map state; queue only actions the product can safely retry.
- Add opt-in official-notice notifications after permissions, regional targeting, and unsubscribe controls are designed.

## Phase 4 — quality and launch readiness

- Add automated tests for mobile navigation, report validation, guide search, checklist persistence, authority review, and notice publication.
- Test public mobile screens on supported phone widths, small phones, tablets, iOS, and Android.
- Test dashboard keyboard navigation and small-screen table behavior.
- Add error logging that excludes personal details and exact locations.
- Document deployment, environment variables, backup, access-control, and incident-response procedures.
- Run an accessibility review with keyboard and screen-reader checks.

## Collaboration rhythm

1. Each owner creates one short issue or task describing the exact files and behavior they will change.
2. Work on a feature branch or isolated worktree.
3. Keep shared-module changes in a separate small change and ask the team to review before merging.
4. Before handoff, run the checks in `docs/collaboration.md`, inspect mobile and desktop layouts, and report limitations.
5. The team integrates one workstream at a time, resolves shared contract changes first, then runs the end-to-end journey above.

## Suggested first-week backlog

| Priority | Owner | Deliverable |
|---|---|---|
| P0 | Collaborator 1 | Map-panel filters, incident states, official notices, OpenStreetMap decision, location-privacy plan |
| P0 | Collaborator 2 | Report-panel validation, submission, error, retry, and queued states |
| P0 | Collaborator 3 | Mesh-panel state clarity, queued-action visibility, accessibility fallback, and transport/privacy proposal |
| P0 | Collaborator 4 | Help-panel feed states plus offer availability, capacity, management, withdrawal, and privacy states |
| P0 | Collaborator 5 | Guides-panel metadata, contacts configuration, search, related guides, and checklist polish |
| P1 | Team | API contract, backend scaffold, authentication approach, and basic test command |
| P1 | Team | Integrate report-to-dashboard demo journey using the agreed record model |

Do not begin live dispatch, real-time alert claims, or public contact exchange until the required backend, moderation, security, and operational ownership exist.
