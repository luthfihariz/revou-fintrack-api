---
name: fintrack-production-audit
description: "Run the FinTrack production-readiness audit for environment configuration, secrets, CORS, auth rate limits, database health, logging, and CI tests. Use after a code review or when asked to check PRODUCTION-AUDIT.md."
argument-hint: "Audit the current repository"
user-invocable: true
---

# FinTrack Production Audit

Run every item in `PRODUCTION-AUDIT.md` against the current repository and the commit/change under review. Do not mark an item complete from documentation alone when the implementation or git history can be checked.

## Audit procedure

1. Read `PRODUCTION-AUDIT.md`, `README.md`, `.github/copilot-instructions.md`, package scripts, bootstrap/module configuration, auth code, health controller, logger middleware, and git ignore/history as needed.
2. If reviewing a PR, audit the PR diff and its target branch context. State when a repository-wide property cannot be proven from the diff alone.
3. Check each item below and record `PASS`, `FAIL`, or `INCONCLUSIVE` with concise evidence and file references.

### Environment and secrets

- Confirm configuration and secrets use environment variables rather than hardcoded values. Check `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, and `CORS_ORIGINS` plus any newly introduced setting.
- Confirm `.env` and local secret variants are git-ignored.
- Search tracked files for likely credentials, tokens, private keys, passwords, and connection strings.
- Inspect git history for committed secrets, while avoiding disclosure of secret values in the report. A clean current tree is insufficient if history contains a secret.

### Network and authentication security

- Confirm CORS allows only configured, known frontend origins and does not silently fall back to `*` in production.
- Confirm authentication routes are rate-limited with the intended `@nestjs/throttler` configuration, and verify the limiter is actually applied to login/register routes.
- Confirm JWT secret/configuration is required and protected routes use `JwtAuthGuard`.

### Health and observability

- Confirm `GET /health` checks database reachability through `PrismaService` rather than only returning process-up.
- Confirm request logging uses Nest `Logger` or an approved structured logger and captures useful request metadata without credentials, tokens, password hashes, or sensitive financial payloads.
- Search for stray `console.log` in production source.

### Verification and CI

- Run the repository's relevant tests, at minimum `npm test` when dependencies are available. Run `npm run build` and `npm run lint` when appropriate.
- Check CI/workflow configuration if present and distinguish local test success from proof that the deployed commit passes CI.
- Report missing CI coverage or unavailable database-dependent tests as gaps, not passes.

## Output

Use this compact table:

| Check | Result | Evidence |
| --- | --- | --- |
| Env vars used for all config/secrets | PASS/FAIL/INCONCLUSIVE | files, commands, or limitation |
| Secrets absent from git history, `.env` git-ignored | PASS/FAIL/INCONCLUSIVE | evidence without secret values |
| CORS restricted to known frontend origins | PASS/FAIL/INCONCLUSIVE | configuration and fallback behavior |
| Rate limiting on authentication routes | PASS/FAIL/INCONCLUSIVE | module/controller evidence |
| `GET /health` checks database | PASS/FAIL/INCONCLUSIVE | health implementation |
| Structured logging, no stray `console.log` | PASS/FAIL/INCONCLUSIVE | logger/search evidence |
| Tests passing in CI on deployed commit | PASS/FAIL/INCONCLUSIVE | workflow/commit evidence |

Finish with the highest-risk failures, environment prerequisites, and exact commands that were run. Never print secret values or claim CI/deployment verification without evidence.
