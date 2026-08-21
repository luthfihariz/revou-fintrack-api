## W25D2


### Spec: Category Budgets
A Budget belongs to one Category and one User (the owner).

Fields: id, month (integer, 1 to 12 inclusive), year (integer), limitAmount (decimal, greater than 0), categoryId, userId.

POST /budgets — any logged-in user creates a budget for one of their categories.
GET /budgets — logged-in only, lists the caller’s own budgets.
DELETE /budgets/:id — only the budget’s owner may delete it.

Create Schema
Create src/budgets/dto/create-budget.dto.ts with class-validator decorators: month must be an integer between 1 and 12 inclusive (@IsInt(), @Min(1), @Max(12)), year must be a positive integer (@IsInt(), @Min(2000)), limitAmount must be a number greater than 0 (@IsNumber(), @IsPositive()). Follow the decorator import style in src/accounts/dto/create-account.dto.ts.

Create Budget Service Method
Add the create budget method in the budget service, use prisma to persist it in the repo. Make sure to throw NotFoundException if category is not found.


Find All Budget 
Add the findAllBudget for a given user in the budget service, use prisma.


Delete Budget Service Method
Add the remove budget, make sure we enforce the ownership just like we did it in @transaction.service.ts


Controller Wiring
now wire everything in the @sym:BudgetsController

POST /budgets — any logged-in user creates a budget for one of their categories.
GET /budgets — logged-in only, lists the caller’s own budgets.
DELETE /budgets/:id — only the budget’s owner may delete it.

no tests required for now