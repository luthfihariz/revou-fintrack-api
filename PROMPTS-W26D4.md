## Production Readiness
- Write and explain the production readiness checklist
- Auditing using AI, run the prompt

## Create skills
- Create the skills to run code review and production readiness checklist
- TDD skills, but update the @AGENTS.md to also cover about best practices and coding convention
- Write a skills under agent/skills for test driven development

use this skills to both implement and plan a feature, when writing plan you should also include the test plans for the unit tests
start with writing the test, make sure it fails, and work on the implementation to pass the tests, refactor the implementation to follow the convention and the best practice, then make sure the test is still passing
focus on unit test and testing the service only/business logic
make sure to cover the happy path and edge cases as well

- implementation: Add a new endpoint GET /budgets/insight that will list all of the existings user budget but with the percentage of the budget usage, e.g: I have a budget name Travel with 5000 limitAmount, and all the transactions for that category has reach 4000, meaning I have been using 80% of the budget. Use TDD approach.