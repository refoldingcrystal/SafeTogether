# SafeTogether implementation plan

This plan turns the current local prototype into a product foundation without having several people change the same files. It assumes four collaborators working by product feature rather than fixed file ownership.

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

Suggested team tasks:

- Collaborator 4 drafts `docs/api-contract.md` with request/response examples and error formats.
- The four collaborators agree on the backend, database, deployment environment, and authentication provider.
- Collaborator 4 proposes the Expo app structure, native navigation, and repeatable mobile lint, test, and build commands.
- Any shared-state, route, or design-system change gets team review before integration.

Definition of done: feature owners can build against a stable record shape and know which data is public, private, queued, stale, or live.

## Phase 1 — feature workstreams that can start now

### Collaborator 1 — report and community assistance

First sprint:

1. Rebuild report and help-offer flows as native Expo screens and separate their validation rules.
2. Add explicit loading, success, retry, and duplicate-submission states.
3. Preserve values after a failed submission.
4. Add a local “my offers” view with withdraw and expiry controls, clearly marked as demo-only.
5. Add privacy copy that explains approximate locations and private contact handling.

Next after backend integration:

- Replace local storage writes with API calls.
- Add server-returned report references and retry behavior.
- Add authenticated offer ownership and withdrawal.
- Add secure attachment metadata only after upload handling is designed.

Handoff: list form fields, validation behavior, API assumptions, and changed files.

### Collaborator 2 — information, guides, and preparedness

First sprint:

1. Rebuild guides as native Expo screens with category filtering, search empty states, and related links.
2. Give every guide a review date and source placeholder.
3. Add a configurable emergency-contacts panel that does not assume one country’s emergency number.
4. Keep checklist progress local and explain that limitation in the UI.
5. Review all guide copy for plain language and clear warnings.

Next after content governance exists:

- Load published guides from the API.
- Add language support, revision history, reviewer identity, and official source links.
- Add region-specific contacts from configuration.

Handoff: list changed guide content, sources still needed, and any claims that need official review.

### Collaborator 3 — authority operations

First sprint:

1. Replace prompt-based report review with an accessible detail panel or page.
2. Add confirmation dialogs for verify, reject, status changes, and notice withdrawal.
3. Add internal-note fields that are visibly internal and never render in public views.
4. Improve empty, loading, and error states for each dashboard section.
5. Keep resource assignment as a demo workflow until a dispatch integration exists.

Next after authentication and backend integration:

- Enforce roles on the server.
- Persist review decisions, notes, notices, and audit events.
- Add notices preview/publish/withdraw status handling.
- Add unit availability and assignment history.

Handoff: list authority actions added, confirmation behavior, server authorization requirements, and public/private boundaries.

### Collaborator 4 — maps, platform foundation, and integration

First sprint:

1. Scaffold the Expo mobile application after the team accepts the package and app-navigation proposal.
2. Create the initial API-contract proposal and public/private field rules for team review.
3. Evaluate an OpenStreetMap renderer and tile-service approach, including attribution and expected usage limits.
4. Define approximate-location handling before any public marker is introduced.
5. Prepare a native map component boundary that can replace the current demonstration map without changing report or dashboard workflows.

Next after team agreement:

- Integrate the chosen React Native OpenStreetMap renderer and approved tile provider.
- Add location permission, loading, error, cached, and offline states.
- Connect shared models to backend endpoints and keep the public map restricted to approved, approximate data.

Handoff: state the renderer and tile-source recommendation, attribution requirements, privacy decisions, API assumptions, and integration risks.

## Phase 2 — integration checkpoint

The team integrates work only after the shared model is agreed. Verify this journey end to end:

1. A public report is submitted and receives a reference.
2. It enters the authority review queue as `Awaiting review`.
3. An authority user changes its review state.
4. The public map and incident detail reflect only approved public information.
5. An authority user publishes an official notice.
6. The public map presents that notice as official, distinct from community reports.

Add a similar test path for a help offer: create, browse approximate information, withdraw, and ensure private contact details remain unavailable publicly.

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
| P0 | Collaborator 1 | Native Expo report and offer flows, validation, submission states, local offer management |
| P0 | Collaborator 2 | Native Expo guide flows, guide metadata, contacts configuration, search and checklist polish |
| P0 | Collaborator 3 | Accessible incident review panel, confirmations, internal notes UI |
| P0 | Collaborator 4 | Expo foundation proposal, API contract, OpenStreetMap integration decision, location-privacy plan |
| P1 | Collaborator 4 with team review | Expo scaffold, backend scaffold, authentication approach, basic test command |
| P1 | Team | Integrate report-to-dashboard demo journey using the agreed record model |

Do not begin live dispatch, real-time alert claims, or public contact exchange until the required backend, moderation, security, and operational ownership exist.
