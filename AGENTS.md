
# FinTrack API Copilot Instructions

## Project Overview

FinTrack is a NestJS REST API for personal finance tracking. It uses PostgreSQL through Prisma, JWT authentication with bcrypt, class-validator DTOs, and TypeScript.

## Project Structure

- `src/main.ts`: application bootstrap, Helmet, explicit CORS, and the global `ValidationPipe`.
- `src/app.module.ts`: root module and global logging middleware registration.
- `src/auth/`: registration, login, JWT strategy, and authentication DTOs.
- `src/users/`: user management and user DTOs.
- `src/accounts/`: account CRUD, ownership checks, and account transactions.
- `src/categories/`: category CRUD and admin-only deletion.
- `src/transactions/`: transaction CRUD and balance updates.
- `src/transactions/balance-calculator.service.ts`: signed transaction effects and balance calculation.
- `src/budgets/`: budget module and schema-backed budget functionality; HTTP support may be incomplete.
- `src/common/`: shared decorators, guards, and middleware.
- `src/prisma/`: global `PrismaService` and Prisma module.
- `prisma/schema.prisma`: source of truth for the Prisma data model.
- `prisma/migrations/`: committed database migrations.
- `prisma/seed.ts`: development/sample data seeding.
- `db/`: hand-written SQL mirroring the Prisma schema and analytical queries.
- `docs/`: ERD, API smoke-test instructions, and Postman collection/environment.
- `BUDGET-SPECS.md`: budget requirements and expected behavior.
- `dist/` and `coverage/`: generated build and test artifacts; do not edit them manually.

## Coding Conventions

- Follow NestJS conventions: one module, controller, and service per domain. Keep controllers thin and put business rules in services.
- Use dependency injection for services and shared logic. Reuse `PrismaService`; do not create ad-hoc database clients.
- Add request shapes as DTO classes under the domain's `dto/` directory and use `class-validator` decorators.
- Preserve the global validation behavior in `src/main.ts`: unknown properties are rejected, known properties are transformed, and payloads are validated.
- Protect private endpoints with the existing JWT guard and enforce resource ownership in the service layer. Do not rely only on controller-level checks.
- Use `RolesGuard` and `@Roles(...)` for role-based access such as admin-only operations.
- Never return password hashes. Use explicit Prisma `select` objects for user responses and sanitize authentication results.
- Keep balance-changing transaction operations atomic with `prisma.$transaction`. On create, update, and delete, correctly apply or reverse the signed effect of income, expense, and transfer transactions.
- Use Prisma `Decimal` and PostgreSQL `NUMERIC(12,2)` for money. Never use `Float` for monetary values.
- Keep `transactions.type` separate from `categories.type`; transfers are a transaction type and are balance-neutral for the current single-account model.
- Preserve API naming and existing response shapes unless the change explicitly requires a breaking change.
- Use the existing formatting and linting configuration. Prefer clear, descriptive names and small focused changes.
- Do not commit secrets, local `.env` files, generated output, or unrelated formatting changes.

## Environment and Database Setup

1. Require Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, and `CORS_ORIGINS`.
3. Install dependencies with `npm install` (the README uses npm; keep lockfile changes intentional).
4. Generate Prisma Client with `npm run prisma:generate` when the schema or generated client needs updating.
5. For local development, apply migrations with `npm run prisma:migrate` or `npx prisma migrate dev --name <change-name>`.
6. Seed sample data with `npm run db:seed` when needed. Seed credentials are documented in `README.md` and are for development only.
7. Use `npm run prisma:deploy` for applying committed migrations in deployment environments; do not use `migrate dev` there.

## Build, Run, and Verify

- Build: `npm run build`
- Development server with watch mode: `npm run start:dev`
- Normal start: `npm run start`
- Production start after building: `npm run start:prod`
- Format TypeScript: `npm run format`
- Lint and auto-fix: `npm run lint`
- Run tests: `npm test`

The API defaults to `http://localhost:3000`, unless `PORT` changes it. Before reporting a change as complete, run the narrowest relevant test or build check, then run formatting/linting as appropriate. For endpoint changes, consult `docs/api-smoke-test.md` and update API documentation when behavior changes.

## Change Guidance

- Read the neighboring module, DTO, service, and controller before changing an endpoint.
- Update `prisma/schema.prisma` and add a migration when changing persisted data; regenerate the client afterward.
- Keep raw SQL in `db/` synchronized when schema changes require it.
- Update `docs/erd.dbml`, smoke-test documentation, or Postman artifacts when the public API or data model changes.
- Avoid adding new dependencies or abstractions when an existing NestJS, Prisma, or shared helper pattern covers the need.
