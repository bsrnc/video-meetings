# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from this directory, or via root scripts (`dev:api`, `build:api`, `start:api`, `lint`, `lint:fix`, `typecheck`, prefixed at the repo root):

```bash
npm run dev           # nest start --watch
npm run build         # nest build
npm run start         # nest start
npm run start:prod    # node dist/main (after build)
npm run lint           # eslint
npm run lint:fix       # eslint --fix
npm run typecheck      # tsc --noEmit

npm run test           # jest (unit)
npm run test:watch
npm run test:cov
npm run test:e2e       # jest --config test/jest-e2e.json
```

To run a single test file: `npm run test -- app.controller.spec.ts` (path relative to `src/`, since Jest's `rootDir` is `src`).

## Architecture

Skeleton only — the default Nest CLI template, single root module:

- `src/main.ts` — bootstraps the app (`NestFactory.create`), listens on `process.env.PORT ?? 3000`.
- `src/app.module.ts` / `app.controller.ts` / `app.service.ts` — one module, controller, service.
- `test/` — e2e tests (`jest-e2e.json` config), separate from unit tests colocated in `src/*.spec.ts`.

Prettier (`.prettierrc`) and ESLint (`eslint.config.mjs`) configs are the Nest generator's defaults; the Prettier values match the repo-root `.prettierrc.json`.
