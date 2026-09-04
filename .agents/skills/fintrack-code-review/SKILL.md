---
name: fintrack-code-review
description: "Review current FinTrack API changes or a GitHub pull request for correctness, architecture, DRY, KISS, YAGNI, security, performance, and production readiness. Use when asked to review code, current changes, a PR link, or run a production audit."
argument-hint: "Review current changes or paste a pull request URL"
user-invocable: true
---

# FinTrack Code Review

Review only the proposed change, but inspect enough surrounding code to verify its contract. This repository is a NestJS + Prisma personal-finance API; use the Architecture section of `README.md` and `.github/copilot-instructions.md` as the correctness baseline.

## 1. Establish the review target

- If the user provides a GitHub PR URL, inspect the PR title, description, base branch, head branch, changed files, and commits. Use the repository's GitHub integration when available; otherwise use the URL and local git commands that can access it.
- Check whether the PR title and description are present, clear, and consistent with the actual changes. Report missing, misleading, or materially incomplete context.
- If no PR URL is provided, review the current working-tree changes. Inspect `git status --short`, the unstaged diff, the staged diff, and the relevant diff against the current branch's upstream/base when available. Do not treat unrelated pre-existing edits as findings.
- Identify the changed endpoint, service, data model, configuration, or test surface before reading broadly.

## 2. Verify correctness against the architecture

Trace each changed behavior from controller through guards/decorators, DTO validation, service rules, Prisma query, and response. Check:

- NestJS module/controller/service ownership and dependency injection are preserved.
- Controllers remain thin and business rules stay in services.
- Authentication uses the existing JWT guard and the JWT payload/user shape remains compatible.
- User responses never expose password hashes.
- Account and transaction ownership is enforced in the service layer, including nested-resource lookups.
- Roles use `RolesGuard` and `@Roles(...)` consistently for admin-only behavior.
- Global `ValidationPipe` assumptions remain true: unknown fields are rejected, known values are transformed, and DTO constraints cover required input.
- Transaction create/update/delete balance effects remain correct and atomic with `prisma.$transaction`; income, expense, and transfer semantics stay distinct.
- Money remains Prisma `Decimal` and PostgreSQL `NUMERIC`, never floating point.
- API response shapes, status codes, error behavior, and documented endpoints do not drift unintentionally.
- Prisma schema, migrations, seed data, raw SQL, ERD, smoke tests, and Postman artifacts stay synchronized when the change affects them.

Use tests and neighboring implementations as evidence. Do not infer correctness from names alone.

## 3. Check design quality

For the changed slice, look for:

- **DRY:** repeated authorization, validation, mapping, query construction, or balance logic that should reuse an existing local abstraction. Do not abstract one-off code without a concrete benefit.
- **KISS:** unnecessary indirection, clever control flow, duplicated state, or overcomplicated Prisma queries where a direct existing pattern is clearer.
- **YAGNI:** unrequested endpoints, fields, dependencies, configuration, generalized frameworks, or speculative error handling.

Only report these as findings when they create maintenance risk, inconsistency, or avoidable complexity. Prefer a small local fix over a broad refactor.

## 4. Check security

Inspect authentication and authorization on every changed route. Verify:

- Public versus protected routes are intentional.
- Login/register throttling still applies to authentication routes and does not accidentally disappear through inheritance or module changes.
- Resource ownership is checked before reads, updates, deletes, and nested queries; IDs cannot be used to cross user boundaries.
- Admin role checks cannot be bypassed by missing metadata or alternate routes.
- DTO validation rejects unexpected properties, malformed IDs, invalid enums, negative/unsafe monetary values, and invalid dates where relevant.
- Secrets and configuration come from environment variables; `.env` is ignored and no credentials/tokens are committed or logged.
- CORS remains restricted to configured frontend origins, Helmet remains enabled, and logs do not disclose credentials, hashes, tokens, or sensitive financial data.
- Prisma inputs are parameterized through Prisma APIs; raw SQL is reviewed for injection and authorization issues.

Report exploitability and affected route/data, not just the existence of a suspicious line.

## 5. Check performance and operability

Look for:

- N+1 query patterns in loops, relation loading, or per-item authorization checks.
- Missing pagination, filtering, or bounded result sets on list endpoints that can grow.
- Over-fetching relations/columns, especially passwords or large nested collections.
- Missing indexes or inefficient predicates for new query paths.
- Repeated database calls that could be combined without weakening authorization or consistency.
- Unbounded request payloads, expensive bcrypt use outside authentication, or synchronous work in request paths.
- Health checks that report process health without checking database reachability.
- Logging that uses unstructured `console.log` rather than the existing Nest logger/middleware.

Call out measured or clearly reasoned impact and give a focused remediation.

## 6. Run focused verification

Run the narrowest relevant checks first, then broaden only as needed:

1. Inspect changed-file tests and run the matching Jest test(s), if present.
2. Run `npm test -- --runInBand` when the change is shared or no narrower test exists.
3. Run `npm run build` for TypeScript/module/schema contract changes.
4. Run `npm run lint` when lintable TypeScript changed. Treat unrelated pre-existing failures separately.
5. Do not require a live database for unit checks; run e2e/smoke checks only when the environment is configured.

After code review, execute the `fintrack-production-audit` workflow from `PRODUCTION-AUDIT.md` and include its results.

## Review output

Lead with findings ordered by severity: blocker, high, medium, low. Each finding must include:

- the issue and why it is incorrect/risky;
- a clickable file and line reference when available;
- the concrete scenario or affected endpoint/data;
- a focused remediation.

Then include, in this order:

- open questions or assumptions;
- verification commands and outcomes;
- PR metadata check, when reviewing a PR;
- production audit results;
- a brief change summary.

If there are no findings, say so explicitly and list remaining test or environment gaps. Do not invent findings to fill the report.
