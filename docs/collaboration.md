# SafeTogether contributor onboarding

## Before starting

1. Share the repository link and this README with each collaborator.
2. Ask each person to clone the repository and use their own branch or isolated worktree. Avoid having multiple people edit the same working tree.
3. Have each person run the app locally with `python3 -m http.server 4173`, then open `http://localhost:4173`.
4. Ask contributors to inspect `git status --short` before editing and preserve any changes they find.
5. Assign one feature and its files to each person. Ask them to post their ownership before they begin.

## Suggested assignments

| Owner | Area | Planned destination | Current overlap |
|---|---|---|---|
| Collaborator 1 | Report and offer-help flows | `src/public/forms.js`, `src/public/forms-events.js`, `src/public/forms.css` | Both forms share a module because they use the same form pattern |
| Collaborator 2 | Information & Guides | `src/public/guides.js`, `src/public/guides-events.js`, `src/public/guides-data.js`, `src/public/guides.css` | Guide data and interaction handlers are isolated from other public features |
| Collaborator 3 | Authority dashboard | `src/authority/dashboard.js`, `src/authority/events.js`, `src/authority/dashboard.css` | Dashboard data uses shared state from `src/shared/state.js` |
| Coordinator | App shell, navigation, shared state, CSS integration | `index.html`, `src/app.js`, `src/styles.css`, `src/shared/` | Coordinate shared state and UI API changes |

The prototype is split into feature modules. Contributors can work in their assigned feature files, but coordinate edits to shared event handlers, data, and state. Keep edits within the assigned files when possible.

## Coordination rules

- Claim exact files or functions in the team channel before editing.
- Do not edit another person's claimed files without coordinating with them.
- Keep each change focused on the assigned feature and explain any shared API or data-model changes.
- Do not reset, overwrite, stash, or discard another contributor's work.
- Do not commit, push, merge, or rebase another person's changes. Each contributor should share a branch or reviewable diff for the coordinator to integrate.
- Before integrating a change, check `git status --short` and review the diff.

## Before handing work back

Run the module syntax check and whitespace check:

```sh
for file in src/app.js src/shared/*.js src/public/*.js src/authority/*.js; do node --input-type=module --check < "$file" || exit 1; done
git diff --check
```

There are currently no package scripts, build command, lint configuration, or automated test suite. In the handoff, list changed files, interactions completed, checks run, and any backend or integration gaps. The prototype is local-only: reports, offers, notices, and checklist progress are saved in the current browser's local storage and are not shared with other users.

## Copyable kickoff message

> We’re building SafeTogether from the local frontend prototype. Please read `README.md` and `docs/collaboration.md`, run it locally, then claim one suggested assignment in the team channel before editing. Use your own branch or isolated worktree. Work in the feature files assigned to you; coordinate changes to `src/shared/`, shared event handlers, and shared state. Keep changes focused, preserve existing work, run the listed checks, and send back your branch/diff with changed files and known limitations. No commits or merges on behalf of another contributor.
