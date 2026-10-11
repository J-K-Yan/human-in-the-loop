# Prototype verification — 2026-10-11

Cloud checkout: `/workspace/human-in-the-loop`, branch `work`, initially empty with no commits. No repository-specific instructions or skills were present. No prior work was overwritten. Initial verification preceded publication; publication readiness results are recorded below.

Environment: Node 24.19.0, npm 11.9.0, TypeScript, Vite 7.3.7, system Chromium through Playwright. Initial npm installation failed because `/home/agent/.npm/_cacache` was unavailable; retry with `--cache /tmp/hitl-npm-cache` succeeded.

| Command | Result |
| --- | --- |
| `npm test` | 8 passed, 0 failed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; static production bundle generated |
| `npx playwright test` | 5 passed, 0 failed |
| `node --check server/index.mjs` | Passed |
| `git diff --check` | No errors (all prototype files are new/untracked) |

Engine testing enumerates all valid four-action prefixes, checks every action's bounds and rejection behavior at those states, then completes those paths with rest through turn eight and verifies save round trips. Separate tests exercise project success, unsuccessful testing followed by feedback recovery, missed/kept commitments, unknown actions, insufficient resources, ending divergence and tampered saves.

Browser testing covers full beginning-to-ending play, save/reload/reset, corrupt saves, model failure, duplicate form submission, repeatable-action double clicks, cancelled requests, late replies after reset, and mobile horizontal fit at 390 px. The main play test records uncaught browser errors and observed none. Desktop and mobile screenshots were visually inspected; generated evidence lives in `/tmp/hitl-ending.png` and `/tmp/hitl-mobile.png`.

Adapter testing uses a local mock HTTP provider, explicit non-secret fixture values and no real model. It verifies missing configuration, request shape, exclusion of unrelated character data, invalid action rejection and stripping attempted resource mutations from output. Live-model compatibility, dialogue quality and real provider failures remain untested. The playable slice has eight action slots; its intended reading/exploration duration has not been user-tested.

## Public-demo readiness — 2026-10-11

After explicit authorization to create initial `main` and publish a public demo, the remote was checked again and still had no refs. Production builds now disable the live-mode control at compile time and tree-shake the `/api/respond` request path. Development builds retain the optional local model adapter.

Reverification: `npm test` 8/8 passed; `npm run build` (including TypeScript) passed; `npx playwright test` 5/5 passed; `npx playwright test --config playwright.public.config.ts` 1/1 passed. The production browser test checks the disabled live control, absent API path in compiled JavaScript, zero model API requests, save/reload, full play through the ending and restart. Candidate tracked files were reviewed; `.env`, dependencies and build output are ignored, and no secret values were found in the source set.

Sites publication requires the official `site-workflow.mjs` source helper and `set-project-id.mjs`. They are not installed in this executor (filesystem search returned no matches), although the native Sites tools and cloud skill documentation are available. No Site registration or deployment was attempted without the required helper. The exact GitHub commit can be retrieved in a Sites-enabled executor, built with `npm ci && npm run build`, and its `dist/` transferred unchanged into a new static Site for the supported source-helper publication workflow.
