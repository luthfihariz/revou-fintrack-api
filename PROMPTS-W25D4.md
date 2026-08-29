## Install Supertest
npm install supertest --save-dev

## Seting UP Supertest
Phase 1: Test Environment

- Install dotenv-cli as a dev dependency using npm.
- Create .env.test with: A dedicated DATABASE_URL, A test JWT_SECRET, Any other required application variables
- Add .env.test to .gitignore.
- Use a separate database or schema from development so test data cannot affect .env.
- Prisma already reads DATABASE_URL through schema.prisma, so no Prisma schema changes are required.

Phase 2: Jest Configuration

- Add test/jest-e2e.json with: Repository root resolution, ts-jest preset, Node test environment, Discovery for test/**/*.e2e-spec.ts
- Add a test:e2e script to package.json that loads .env.test with dotenv-cli, then runs Jest using the e2e config and --runInBand.
- Add a separate prisma:deploy:test script that also loads .env.test before running Prisma migrations.

Phase 3: First Supertest Test

- Create test/app.e2e-spec.ts.
- Build the application from app.module.ts in beforeAll.
- Apply the same ValidationPipe configuration used in main.ts.
- Call app.init().
- Add a first deterministic test: Send GET /categories without authentication. Expect HTTP 401. 
- Add a database-backed registration test using a unique email.
- Close the app in afterAll so prisma.service.ts disconnects cleanly.

Do not import main.ts, since it starts a real HTTP listener.

## Prompting E2e budgets test
Write e2e tests for POST /budgets covering the happy path and common error responses. Make sure to seed the necessary category and user first.

Write e2e tests for DELETE /budgets covering both path as well.

Write e2e tests for POST /transactions.

Instead of calling an actuall HTTP when seeding beforeAll tests cases run, use Prisma seeding directly and clean up the data after it runs, at afterAll hooks.