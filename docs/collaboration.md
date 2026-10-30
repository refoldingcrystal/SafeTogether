# SafeTogether contributor onboarding

## Before starting

1. Share the repository link and this README with each collaborator.
2. Ask each person to clone the repository and use their own branch or isolated worktree. Avoid having multiple people edit the same working tree.
3. Have each person run the browser prototype locally with `python3 -m http.server 4173`, then open `http://localhost:4173`. Read `docs/mobile-app.md` before starting React Native work.
4. Ask contributors to inspect `git status --short` before editing and preserve any changes they find.
5. Assign one feature outcome to each person. Ask them to post their ownership and expected touchpoints before they begin.

## Suggested feature workstreams

| Collaborator | Feature outcome | First focus | Likely touchpoints |
|---|---|---|---|
| Collaborator 1 | Emergency reports and community help | Native report and offer workflows, submission quality, retry states, offer management, privacy language | Expo public-app forms and shared incident/offer data |
| Collaborator 2 | Information, guides, and preparedness | Native guides, search, guide quality, contacts, checklist, content governance | Expo guides feature, guide data, future content API |
| Collaborator 3 | Authority operations | Incident review, notices, internal notes, resource workflow, audit history | Authority dashboard and shared incident/notice data |
| Collaborator 4 | Mobile maps, platform foundation, and integration | Expo mobile foundation, OpenStreetMap research and implementation plan, shared contracts, backend/API groundwork, app integration | Mobile navigation, map, API contracts, test and deployment setup |

The prototype is split into feature modules. These workstreams describe outcomes rather than exclusive files: contributors should make the smallest necessary changes across the app, coordinate shared-data changes in advance, and avoid concurrent edits to the same file.

Expo / React Native is the public-app stack. OpenStreetMap is the intended future map-data direction. The maps workstream should document the selected React Native renderer, tile source, attribution, usage limits, and location-privacy approach before replacing the demonstration map.

## Coordination rules

- Claim the feature outcome, user journey, and expected files in the team channel before editing.
- Coordinate before changing a file another collaborator is actively editing.
- Keep each change focused on the assigned feature and explain shared API or data-model changes.
- Do not reset, overwrite, stash, or discard another contributor's work.
- Do not commit, push, merge, or rebase another person's changes. Each contributor should share a branch or reviewable diff for the team to review and integrate.
- Before integrating a change, check `git status --short` and review the diff.

## Before handing work back

Run the module syntax check and whitespace check:

```sh
for file in src/app.js src/shared/*.js src/public/*.js src/authority/*.js; do node --input-type=module --check < "$file" || exit 1; done
git diff --check
```

There are currently no package scripts, build command, lint configuration, or automated test suite. In the handoff, list changed files, interactions completed, checks run, and any backend or integration gaps. The prototype is local-only: reports, offers, notices, and checklist progress are saved in the current browser's local storage and are not shared with other users.

## Copyable kickoff message

> We’re building SafeTogether as an Expo / React Native public mobile app plus an authority web dashboard. Please read `README.md`, `docs/collaboration.md`, `docs/implementation-plan.md`, and `docs/mobile-app.md`; run the current browser prototype locally; then claim one feature workstream and its user journey in the team channel before editing. Use your own branch or isolated worktree. Coordinate shared API, map, and data-privacy changes before making them. Keep changes focused, preserve existing work, run the listed checks, and send back your branch/diff with changed files and known limitations. OpenStreetMap is our future map direction; do not replace the demonstration map until renderer, attribution, tile source, and location privacy are agreed.
