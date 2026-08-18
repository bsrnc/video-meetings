# Split Auth/Users Modules via CQRS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple `AuthModule` from `UsersModule` by replacing the direct cross-module service injection (`UsersService` injected straight into auth's command/query handlers) with `@nestjs/cqrs` commands and queries, so the two modules only ever talk to each other through the command/query bus.

**Architecture:** `AuthModule` keeps all token-related logic (`AuthTokenService`, `JwtAuthGuard`) plus the register/login orchestration handlers (password hashing/verification is authentication logic, so it stays in auth). `UsersModule` keeps `UsersService` (Prisma access) but stops exporting it; instead it exposes a `CreateUserCommand`/`CreateUserHandler` and a `FindUserByEmailQuery`/`FindUserByEmailHandler`. Auth's `RegisterHandler`/`LoginHandler` are rewritten to dispatch those through `CommandBus`/`QueryBus` instead of injecting `UsersService`. `@nestjs/cqrs`'s `ExplorerService` scans every module in the app graph at bootstrap (confirmed by reading `node_modules/@nestjs/cqrs/dist/services/explorer.service.js`), so handlers registered as plain `providers` in `UsersModule` are wired into the same app-wide `CommandBus`/`QueryBus` that `AuthModule` uses — `AuthModule` does not need to import `UsersModule` (or vice versa) for this to work.

**Tech Stack:** NestJS 11, `@nestjs/cqrs`, Prisma/PostgreSQL, Jest + Supertest (e2e).

**Spec:** No separate spec doc — requirements come directly from the user's request in this conversation (split `auth` into an auth module and a users module; users module only creates/finds users; the two modules talk via CQRS) plus this plan.

## Global Constraints

- Zero behavior change. `POST /auth/register` and `POST /auth/login` must return byte-identical responses/status codes for every case already covered by `test/auth.e2e-spec.ts` and `test/meetings.e2e-spec.ts`.
- Run `npm run test --workspace apps/api` and `npm run test:e2e --workspace apps/api` after every task below and confirm all pass before moving to the next task. Baseline (already verified before this plan was written): 1/1 unit test passing, 17/17 e2e tests passing.
- No new abstractions beyond what's needed (no repository interfaces, no generic CQRS base classes) — mirror the existing `RegisterCommand`/`RegisterHandler` style already in `src/auth/`.
- Follow existing formatting/lint (`npm run lint`, `npm run format:check` from repo root) — run these too before considering a task done.
- Update `apps/api/CLAUDE.md`'s Architecture section to describe the new auth/users CQRS boundary in the same change that makes it true (per root `CLAUDE.md`'s "Keeping docs in sync" rule).

---

## Task 1: Add `CreateUserCommand` + handler to `UsersModule`

**Files:**

- Create: `apps/api/src/users/commands/create-user.command.ts`
- Create: `apps/api/src/users/commands/handlers/create-user.handler.ts`
- Modify: `apps/api/src/users/users.module.ts`

**Interfaces:**

- Produces: `CreateUserCommand(email: string, passwordHash: string)` — a plain command class, constructor-only, matching the style of `apps/api/src/auth/commands/register.command.ts`.
- Produces: `CreateUserHandler implements ICommandHandler<CreateUserCommand, User>` (`User` from `@prisma/client`), registered via `@CommandHandler(CreateUserCommand)`. Internally calls `UsersService.create(email, passwordHash)` and returns its result unchanged.

This task is additive only — nothing yet dispatches `CreateUserCommand`, so behavior is unchanged. Existing `UsersService` export from `UsersModule` stays in place for now (removed in Task 3, once nothing needs it directly).

- [ ] **Step 1: Create the command class**

```typescript
// apps/api/src/users/commands/create-user.command.ts
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly passwordHash: string,
  ) {}
}
```

- [ ] **Step 2: Create the command handler**

```typescript
// apps/api/src/users/commands/handlers/create-user.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { User } from '@prisma/client';
import { UsersService } from '../../users.service';
import { CreateUserCommand } from '../create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<
  CreateUserCommand,
  User
> {
  constructor(private readonly usersService: UsersService) {}

  execute(command: CreateUserCommand): Promise<User> {
    return this.usersService.create(command.email, command.passwordHash);
  }
}
```

- [ ] **Step 3: Register the handler and `CqrsModule` in `UsersModule`**

```typescript
// apps/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { UsersService } from './users.service';

const CommandHandlers = [CreateUserHandler];

@Module({
  imports: [CqrsModule],
  providers: [UsersService, ...CommandHandlers],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 4: Run the full test suite and lint to confirm nothing broke**

Run: `npm run test --workspace apps/api && npm run test:e2e --workspace apps/api && npm run lint --workspace apps/api && npm run typecheck --workspace apps/api`
Expected: 1/1 unit, 17/17 e2e, lint clean, typecheck clean (this task adds dead code so far — no behavior change).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/users/commands apps/api/src/users/users.module.ts
git commit -m "feat(api): add CreateUserCommand to users module"
```

---

## Task 2: Add `FindUserByEmailQuery` + handler to `UsersModule`

**Files:**

- Create: `apps/api/src/users/queries/find-user-by-email.query.ts`
- Create: `apps/api/src/users/queries/handlers/find-user-by-email.handler.ts`
- Modify: `apps/api/src/users/users.module.ts`

**Interfaces:**

- Consumes: `UsersService.findByEmail(email: string): Promise<User | null>` (unchanged, already exists at `apps/api/src/users/users.service.ts`).
- Produces: `FindUserByEmailQuery(email: string)` — plain query class, matching `apps/api/src/auth/queries/login.query.ts` style.
- Produces: `FindUserByEmailHandler implements IQueryHandler<FindUserByEmailQuery, User | null>`, registered via `@QueryHandler(FindUserByEmailQuery)`.

Still additive only — nothing dispatches this query yet.

- [ ] **Step 1: Create the query class**

```typescript
// apps/api/src/users/queries/find-user-by-email.query.ts
export class FindUserByEmailQuery {
  constructor(public readonly email: string) {}
}
```

- [ ] **Step 2: Create the query handler**

```typescript
// apps/api/src/users/queries/handlers/find-user-by-email.handler.ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { User } from '@prisma/client';
import { UsersService } from '../../users.service';
import { FindUserByEmailQuery } from '../find-user-by-email.query';

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<
  FindUserByEmailQuery,
  User | null
> {
  constructor(private readonly usersService: UsersService) {}

  execute(query: FindUserByEmailQuery): Promise<User | null> {
    return this.usersService.findByEmail(query.email);
  }
}
```

- [ ] **Step 3: Register the handler in `UsersModule`**

```typescript
// apps/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { FindUserByEmailHandler } from './queries/handlers/find-user-by-email.handler';
import { UsersService } from './users.service';

const CommandHandlers = [CreateUserHandler];
const QueryHandlers = [FindUserByEmailHandler];

@Module({
  imports: [CqrsModule],
  providers: [UsersService, ...CommandHandlers, ...QueryHandlers],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 4: Run the full test suite and lint to confirm nothing broke**

Run: `npm run test --workspace apps/api && npm run test:e2e --workspace apps/api && npm run lint --workspace apps/api && npm run typecheck --workspace apps/api`
Expected: 1/1 unit, 17/17 e2e, lint clean, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/users/queries apps/api/src/users/users.module.ts
git commit -m "feat(api): add FindUserByEmailQuery to users module"
```

---

## Task 3: Switch auth handlers to CQRS, drop direct `UsersService` dependency

**Files:**

- Modify: `apps/api/src/auth/commands/handlers/register.handler.ts`
- Modify: `apps/api/src/auth/queries/handlers/login.handler.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/users/users.module.ts`

**Interfaces:**

- Consumes: `CreateUserCommand` (Task 1), `FindUserByEmailQuery` (Task 2), both via `CommandBus`/`QueryBus` from `@nestjs/cqrs` (same buses `AuthController` already uses — see `apps/api/src/auth/auth.controller.ts`).
- This is the task that actually changes behavior-preserving wiring: after it, `AuthModule` no longer imports `UsersModule`, and `UsersModule` no longer exports `UsersService` (nothing outside `users/` needs it anymore).

- [ ] **Step 1: Rewrite `RegisterHandler` to use `CommandBus`/`QueryBus`**

```typescript
// apps/api/src/auth/commands/handlers/register.handler.ts
import { ConflictException } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { CreateUserCommand } from '../../../users/commands/create-user.command';
import { FindUserByEmailQuery } from '../../../users/queries/find-user-by-email.query';
import { AuthTokenService } from '../../auth-token.service';
import { RegisterCommand } from '../register.command';

const PASSWORD_HASH_ROUNDS = 10;

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<
  RegisterCommand,
  { accessToken: string }
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(command: RegisterCommand): Promise<{ accessToken: string }> {
    const existingUser = await this.queryBus.execute<
      FindUserByEmailQuery,
      User | null
    >(new FindUserByEmailQuery(command.email));
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(
      command.password,
      PASSWORD_HASH_ROUNDS,
    );
    const user = await this.commandBus.execute<CreateUserCommand, User>(
      new CreateUserCommand(command.email, passwordHash),
    );

    return { accessToken: this.authTokenService.sign(user.id, user.email) };
  }
}
```

- [ ] **Step 2: Rewrite `LoginHandler` to use `QueryBus`**

```typescript
// apps/api/src/auth/queries/handlers/login.handler.ts
import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { FindUserByEmailQuery } from '../../../users/queries/find-user-by-email.query';
import { AuthTokenService } from '../../auth-token.service';
import { LoginQuery } from '../login.query';

@QueryHandler(LoginQuery)
export class LoginHandler implements IQueryHandler<
  LoginQuery,
  { accessToken: string }
> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(query: LoginQuery): Promise<{ accessToken: string }> {
    const user = await this.queryBus.execute<FindUserByEmailQuery, User | null>(
      new FindUserByEmailQuery(query.email),
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      query.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { accessToken: this.authTokenService.sign(user.id, user.email) };
  }
}
```

- [ ] **Step 3: Drop `UsersModule` import from `AuthModule`**

```typescript
// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthTokenService } from './auth-token.service';
import { RegisterHandler } from './commands/handlers/register.handler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginHandler } from './queries/handlers/login.handler';

const CommandHandlers = [RegisterHandler];
const QueryHandlers = [LoginHandler];

@Module({
  imports: [
    CqrsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthTokenService,
    JwtAuthGuard,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [AuthTokenService, JwtAuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 4: Stop exporting `UsersService` from `UsersModule`**

Nothing outside `apps/api/src/users/` injects `UsersService` anymore after steps 1–2 (verify with `grep -rn "UsersService" apps/api/src --include="*.ts"` — only `users/users.service.ts`, `users/commands/handlers/create-user.handler.ts`, and `users/queries/handlers/find-user-by-email.handler.ts` should remain).

```typescript
// apps/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { FindUserByEmailHandler } from './queries/handlers/find-user-by-email.handler';
import { UsersService } from './users.service';

const CommandHandlers = [CreateUserHandler];
const QueryHandlers = [FindUserByEmailHandler];

@Module({
  imports: [CqrsModule],
  providers: [UsersService, ...CommandHandlers, ...QueryHandlers],
})
export class UsersModule {}
```

- [ ] **Step 5: Run the full test suite, lint, and typecheck**

Run: `npm run test --workspace apps/api && npm run test:e2e --workspace apps/api && npm run lint --workspace apps/api && npm run typecheck --workspace apps/api`
Expected: 1/1 unit, 17/17 e2e (same assertions as baseline — register/login/duplicate-email/wrong-password/missing-field/meetings-auth-guard cases), lint clean, typecheck clean. This is the step that actually proves the CQRS wiring works end-to-end (registration and login both round-trip through `CommandBus`/`QueryBus` into `UsersModule` and back).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth apps/api/src/users/users.module.ts
git commit -m "refactor(api): auth module talks to users module via CQRS, not direct DI"
```

---

## Task 4: Update `apps/api/CLAUDE.md` architecture docs

**Files:**

- Modify: `apps/api/CLAUDE.md`

Root `CLAUDE.md`'s "Keeping docs in sync" rule requires this doc to reflect the new module boundary in the same change.

- [ ] **Step 1: Update the `src/users/` and `src/auth/` bullets**

In the "Architecture" section of `apps/api/CLAUDE.md`, replace the current `src/users/` bullet (`` `src/users/` — `UsersService` (`findByEmail`, `create`); no controller, only consumed by `AuthModule`. ``) and the auth bullet's shared-service description so they read like:

```markdown
- `src/users/` — `UsersService` (`findByEmail`, `create`) wraps `PrismaService.user`; not exported — the only consumers are this module's own CQRS handlers. `commands/create-user.command.ts` + `commands/handlers/create-user.handler.ts` (`CreateUserHandler`) creates a user. `queries/find-user-by-email.query.ts` + `queries/handlers/find-user-by-email.handler.ts` (`FindUserByEmailHandler`) looks one up by email. No controller.
- `src/auth/` — CQRS via `@nestjs/cqrs`. `AuthController` (`POST /auth/register` → 201, `POST /auth/login` → 200) only dispatches through `CommandBus`/`QueryBus`, no business logic. `commands/register.command.ts` + `commands/handlers/register.handler.ts` (`RegisterHandler`, `@CommandHandler`) creates the user — write side. `queries/login.query.ts` + `queries/handlers/login.handler.ts` (`LoginHandler`, `@QueryHandler`) looks the user up and verifies the password — read side, no mutation. Both handlers talk to `UsersModule` only through the CQRS bus (`FindUserByEmailQuery`, `CreateUserCommand` — defined in `src/users/`), never by injecting `UsersService` directly; `@nestjs/cqrs`'s `ExplorerService` wires handlers app-wide regardless of which module declares them, so `AuthModule` does not import `UsersModule`. Password hashing/verification (bcrypt) stays inline per handler — that's authentication logic, not user-data logic. Both handlers share `AuthTokenService` for JWT signing. `dto/register.dto.ts` / `dto/login.dto.ts` (`class-validator`) validate controller input before it becomes a command/query — register caps the password at 72 characters because bcrypt silently truncates past 72 bytes. `AuthModule` imports `CqrsModule` and registers handlers as providers (`CommandHandlers`/`QueryHandlers` arrays).
```

- [ ] **Step 2: Verify formatting**

Run: `npm run format:check`
Expected: passes (Markdown isn't Prettier-formatted by this repo's config, but run it anyway to confirm no stray whitespace issues in files actually covered).

- [ ] **Step 3: Commit**

```bash
git add apps/api/CLAUDE.md
git commit -m "docs(api): document auth/users CQRS boundary"
```
