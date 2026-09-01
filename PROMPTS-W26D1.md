## Setup Github Action Workflows
- add the ci.yml based on handbook
- setup eslint npm lint add eslintrc.js, adjust package.json, adjust code that is impacted by eslint


## Prompt to fix the gh action issues
- check github runs 32824182434, we encountered an error at npm run test:e2e, explain why before fixing it
- the gh action stills run an error, it seems like we havent seed any categories into the test db. How can we use @file:seed.sql to feed the db before running any e2e tests ?
- we mention env DATABASE_URL multiple times in several steps, how can we keep it DRY ?

## AI Assisted Review
- make changes and create PR
- Review this PR https://github.com/luthfihariz/revou-fintrack-api/pull/3 code smells: error handling, missing validation, N+1 queries, and anything that could throw an unhandled exception. Don’t rewrite it, just list the issues