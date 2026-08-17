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

Prisma CLI commands run from this directory (loads `prisma.config.ts` automatically):

```bash
npx prisma migrate dev --name <name>   # create + apply a migration
npx prisma generate                     # regenerate the client
```

`migrate dev` does **not** reliably regenerate the client in this Prisma 7 setup (observed: a new model was applied to the DB but missing from `@prisma/client` until `generate` ran explicitly) — always run `generate` after `migrate dev`, or after pulling schema changes from git.

## Architecture

Feature-module Nest app on top of Prisma/PostgreSQL:

- `src/main.ts` — bootstraps the app (`NestFactory.create`), applies a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), listens on `process.env.PORT ?? 3000`.
- `src/app.module.ts` — root module; imports `ConfigModule.forRoot({ isGlobal: true })`, `PrismaModule`, `UsersModule`, `AuthModule`, `MeetingsModule`.
- `src/prisma/` — `PrismaModule` (`@Global()`) provides `PrismaService`, a `PrismaClient` subclass wired with the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter — no built-in engine) and hooked to Nest's `OnModuleInit`/`OnModuleDestroy` lifecycle.
- `src/users/` — `UsersService` (`findByEmail`, `create`); no controller, only consumed by `AuthModule`.
- `src/auth/` — CQRS via `@nestjs/cqrs`. `AuthController` (`POST /auth/register` → 201, `POST /auth/login` → 200) only dispatches through `CommandBus`/`QueryBus`, no business logic. `commands/register.command.ts` + `commands/handlers/register.handler.ts` (`RegisterHandler`, `@CommandHandler`) creates the user — write side. `queries/login.query.ts` + `queries/handlers/login.handler.ts` (`LoginHandler`, `@QueryHandler`) looks the user up and verifies the password — read side, no mutation. Both handlers share `AuthTokenService` (bcrypt hashing/compare stays inline per handler; only JWT signing is shared) and `UsersService`. `dto/register.dto.ts` / `dto/login.dto.ts` (`class-validator`) validate controller input before it becomes a command/query. `AuthModule` imports `CqrsModule` and registers handlers as providers (`CommandHandlers`/`QueryHandlers` arrays).
- `src/meetings/` — plain (non-CQRS) feature module, protected by auth. `MeetingsController` (`POST /meetings` → 201, `GET /meetings` → 200 list, `GET /meetings/:id` → 200 or 404) has `@UseGuards(JwtAuthGuard)` at the controller level. `MeetingsService` wraps `PrismaService.meeting` directly (`create`/`findAll`/`findOne`, throws `NotFoundException` in `findOne`). `dto/create-meeting.dto.ts` requires a non-empty `title`. Meetings have no owner/visibility scoping — `GET /meetings` returns all meetings for any authenticated user, not just the caller's own. `MeetingsModule` imports `AuthModule` to get `JwtAuthGuard`.
- `src/auth/guards/jwt-auth.guard.ts` — `JwtAuthGuard` (`CanActivate`), the shared auth guard for any protected route: reads `Authorization: Bearer <token>`, verifies it via `AuthTokenService.verify` (added alongside `sign`), throws `UnauthorizedException` if missing/invalid. Lives in `auth/` (not a separate `common/`/`shared/` module — only one guard exists so far); `AuthModule` exports both `AuthTokenService` and `JwtAuthGuard` for other feature modules to import.
- `prisma/schema.prisma` — `User` model (`id`, `email` unique, `passwordHash`, `createdAt`) and `Meeting` model (`id`, `title`, `createdAt`); `prisma/migrations/` holds applied migrations.
- `prisma.config.ts` — Prisma 7 config (replaces the old `datasource.url` in the schema file); loads `.env` itself via `import 'dotenv/config'` since the Prisma CLI does not auto-load it.
- `test/auth.e2e-spec.ts` — e2e coverage for register/login (success, duplicate email, wrong/missing credentials).
- `test/meetings.e2e-spec.ts` — e2e coverage for create/list/get-by-id, including 404-not-found and the auth guard (missing token and invalid token) on every route.
- Both e2e spec files build their own `INestApplication` with the same global `ValidationPipe` as `main.ts` (test app bootstrapping doesn't go through `main.ts`, so the pipe is duplicated in each spec's `beforeEach`).
- `test/` — e2e tests (`jest-e2e.json` config), separate from unit tests colocated in `src/*.spec.ts`.

**Database**: PostgreSQL via the root `docker-compose.yml` (`localhost:5434`, see root `CLAUDE.md`). `apps/api/.env` (gitignored; see `.env.example`) holds `DATABASE_URL` and `JWT_SECRET` — required, no defaults, `ConfigService.getOrThrow` fails fast if missing.

Prettier (`.prettierrc`) and ESLint (`eslint.config.mjs`) configs are the Nest generator's defaults; the Prettier values match the repo-root `.prettierrc.json`.
