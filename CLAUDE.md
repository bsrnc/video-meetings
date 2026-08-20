# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

npm-workspaces monorepo (`workspaces: ["apps/*"]`, single root `package-lock.json`). Two independent apps, no shared packages yet:

- `apps/web` — Next.js 16 (App Router, TypeScript, no `src/`, Tailwind v4 + HeroUI v3). See `apps/web/CLAUDE.md`.
- `apps/api` — Nest.js 11 (TypeScript). See `apps/api/CLAUDE.md`.

Always run `npm install` from the repo root, never inside `apps/*` — there is one shared lockfile.

## Commands

Run from repo root:

```bash
npm install              # installs both workspaces

npm run dev               # both apps in dev mode
npm run dev:web           # apps/web only
npm run dev:api           # apps/api only

npm run build              # both apps
npm run build:web
npm run build:api

npm run start:web          # apps/web production server (after build)
npm run start:api          # apps/api production server (after build)

npm run lint                # both apps, check only
npm run lint:fix            # both apps, autofix

npm run test                 # both apps, --if-present (only apps/api has a `test` script)
npm run test:e2e:web         # apps/web Playwright specs (needs `npx playwright install chromium` once)

npm run typecheck           # both apps, tsc --noEmit

npm run format               # prettier --write, whole repo
npm run format:check         # prettier --check, whole repo
```

There is no root-level `start` script — only `start:web` / `start:api`.

`apps/web`'s Playwright specs are wired as `test:e2e`, not `test`, so the
pre-commit hook does not start a dev server and a browser on every commit;
run them with `npm run test:e2e:web`.

To run a single app's own scripts directly (e.g. Nest test commands not exposed at root): `npm run <script> --workspace apps/api`.

## Linting & formatting

- Each app owns its own ESLint flat config (`apps/web/eslint.config.mjs`, `apps/api/eslint.config.mjs`) with its framework's rules. The root has no ESLint config of its own.
- Prettier config is shared from the root `.prettierrc.json` (`singleQuote`, `trailingComma: all`) and applies repo-wide. `apps/api` also carries its own identical `.prettierrc` from the Nest generator — harmless duplicate, nearest-config-wins resolution, values match.

## Git hooks

Husky manages Git hooks (`.husky/`). `pre-commit` runs `npm run lint && npm run test` (both workspaces, root scripts) before every commit — a failing lint or test blocks the commit. `prepare` in root `package.json` installs the hooks on `npm install`.

## Keeping docs in sync

`CLAUDE.md` at root and in each `apps/*` must stay current with the actual architecture. Whenever a change adds/removes a workspace, changes shared config (lint, prettier, tsconfig), or changes an app's structure/scripts/architecture — update the relevant `CLAUDE.md` in the same change, not as a follow-up.

## Requirements

Node >= 20 (`engines.node` in root `package.json`).
