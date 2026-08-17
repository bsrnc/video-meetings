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
npx prisma migrate dev --name <name>   # create + apply a migration, regenerates client
npx prisma generate                     # regenerate the client only
```

## Architecture

Feature-module Nest app on top of Prisma/PostgreSQL:

- `src/main.ts` — bootstraps the app (`NestFactory.create`), applies a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), listens on `process.env.PORT ?? 3000`.
- `src/app.module.ts` — root module; imports `ConfigModule.forRoot({ isGlobal: true })`, `PrismaModule`, `UsersModule`, `AuthModule`.
- `src/prisma/` — `PrismaModule` (`@Global()`) provides `PrismaService`, a `PrismaClient` subclass wired with the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter — no built-in engine) and hooked to Nest's `OnModuleInit`/`OnModuleDestroy` lifecycle.
- `src/users/` — `UsersService` (`findByEmail`, `create`); no controller, only consumed by `AuthModule`.
- `src/auth/` — CQRS via `@nestjs/cqrs`. `AuthController` (`POST /auth/register` → 201, `POST /auth/login` → 200) only dispatches through `CommandBus`/`QueryBus`, no business logic. `commands/register.command.ts` + `commands/handlers/register.handler.ts` (`RegisterHandler`, `@CommandHandler`) creates the user — write side. `queries/login.query.ts` + `queries/handlers/login.handler.ts` (`LoginHandler`, `@QueryHandler`) looks the user up and verifies the password — read side, no mutation. Both handlers share `AuthTokenService` (bcrypt hashing/compare stays inline per handler; only JWT signing is shared) and `UsersService`. `dto/register.dto.ts` / `dto/login.dto.ts` (`class-validator`) validate controller input before it becomes a command/query. `AuthModule` imports `CqrsModule` and registers handlers as providers (`CommandHandlers`/`QueryHandlers` arrays).
- `prisma/schema.prisma` — single `User` model (`id`, `email` unique, `passwordHash`, `createdAt`); `prisma/migrations/` holds applied migrations.
- `prisma.config.ts` — Prisma 7 config (replaces the old `datasource.url` in the schema file); loads `.env` itself via `import 'dotenv/config'` since the Prisma CLI does not auto-load it.
- `test/auth.e2e-spec.ts` — e2e coverage for register/login (success, duplicate email, wrong/missing credentials); builds its own `INestApplication` with the same global `ValidationPipe` as `main.ts` (test app bootstrapping doesn't go through `main.ts`, so the pipe is duplicated there).
- `test/` — e2e tests (`jest-e2e.json` config), separate from unit tests colocated in `src/*.spec.ts`.

**Database**: PostgreSQL via the root `docker-compose.yml` (`localhost:5434`, see root `CLAUDE.md`). `apps/api/.env` (gitignored; see `.env.example`) holds `DATABASE_URL` and `JWT_SECRET` — required, no defaults, `ConfigService.getOrThrow` fails fast if missing.

Prettier (`.prettierrc`) and ESLint (`eslint.config.mjs`) configs are the Nest generator's defaults; the Prettier values match the repo-root `.prettierrc.json`.
