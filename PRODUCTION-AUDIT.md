[ ] Env vars used for all config/secrets — nothing hardcoded
[ ] Secrets absent from git history, .env git-ignored
[ ] CORS restricted to known frontend origin(s)
[ ] Rate limiting applied to authentication routes
[ ] GET /health checks the database, not just the process
[ ] Structured logging (Logger/pino) in place, no stray console.log
[ ] Tests passing in CI on the commit being deployed