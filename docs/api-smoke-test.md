# FinTrack API — Smoke Tests

One example request & response per endpoint. Base URL assumed `http://localhost:3000`.
Replace `$TOKEN` with the `access_token` returned from `/auth/login`.

---

## Auth

### POST /auth/register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dina","email":"dina@fintrack.dev","password":"password123"}'
```

```json
{
  "access_token": "eyJhbGciOi...",
  "user": {
    "id": 4,
    "name": "Dina",
    "email": "dina@fintrack.dev",
    "role": "user",
    "createdAt": "2026-02-20T09:00:00.000Z"
  }
}
```

### POST /auth/login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@fintrack.dev","password":"password123"}'
```

```json
{
  "access_token": "eyJhbGciOi...",
  "user": { "id": 1, "name": "Alice Rahman", "email": "alice@fintrack.dev", "role": "admin", "createdAt": "2026-01-01T00:00:00.000Z" }
}
```

Validation error example (missing password → `400`):

```json
{ "statusCode": 400, "message": ["password should not be empty"], "error": "Bad Request" }
```

---

## Users

### POST /users

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Eka","email":"eka@fintrack.dev","password":"password123"}'
```

```json
{ "id": 5, "name": "Eka", "email": "eka@fintrack.dev", "role": "user", "createdAt": "2026-02-20T09:05:00.000Z" }
```

### GET /users  (auth required — note: no `password` field ever)

```bash
curl http://localhost:3000/users -H "Authorization: Bearer $TOKEN"
```

```json
[
  { "id": 1, "name": "Alice Rahman", "email": "alice@fintrack.dev", "role": "admin", "createdAt": "2026-01-01T00:00:00.000Z" }
]
```

### GET /users/:id  (nested accounts + transaction counts via Prisma `include`)

```bash
curl http://localhost:3000/users/1 -H "Authorization: Bearer $TOKEN"
```

```json
{
  "id": 1,
  "name": "Alice Rahman",
  "email": "alice@fintrack.dev",
  "role": "admin",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "accounts": [
    { "id": 1, "name": "Alice Cash", "type": "cash", "balance": "500000", "_count": { "transactions": 2 } },
    { "id": 2, "name": "Alice BCA", "type": "bank", "balance": "7500000", "_count": { "transactions": 5 } }
  ]
}
```

---

## Accounts  (all require auth + ownership)

### POST /accounts

```bash
curl -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Travel Fund","type":"bank","balance":1000000}'
```

```json
{ "id": 7, "userId": 1, "name": "Travel Fund", "type": "bank", "balance": "1000000", "createdAt": "2026-02-20T09:10:00.000Z" }
```

### GET /accounts

```bash
curl http://localhost:3000/accounts -H "Authorization: Bearer $TOKEN"
```

```json
[ { "id": 1, "userId": 1, "name": "Alice Cash", "type": "cash", "balance": "500000", "createdAt": "2026-01-01T00:00:00.000Z" } ]
```

### GET /accounts/:id

```bash
curl http://localhost:3000/accounts/1 -H "Authorization: Bearer $TOKEN"
```

```json
{ "id": 1, "userId": 1, "name": "Alice Cash", "type": "cash", "balance": "500000", "createdAt": "2026-01-01T00:00:00.000Z" }
```

Not found → `404`:

```json
{ "statusCode": 404, "message": "Account 999 not found", "error": "Not Found" }
```

### GET /accounts/:id/transactions  (relational `include: { category: true }`)

```bash
curl http://localhost:3000/accounts/2/transactions -H "Authorization: Bearer $TOKEN"
```

```json
[
  {
    "id": 6, "accountId": 2, "categoryId": 2, "type": "income", "amount": "1500000",
    "description": "Logo design gig", "transactionDate": "2026-02-10T00:00:00.000Z",
    "category": { "id": 2, "name": "Freelance", "type": "income" }
  }
]
```

### PATCH /accounts/:id

```bash
curl -X PATCH http://localhost:3000/accounts/1 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Alice Petty Cash"}'
```

```json
{ "id": 1, "userId": 1, "name": "Alice Petty Cash", "type": "cash", "balance": "500000", "createdAt": "2026-01-01T00:00:00.000Z" }
```

### DELETE /accounts/:id

```bash
curl -X DELETE http://localhost:3000/accounts/7 -H "Authorization: Bearer $TOKEN"
```

```json
{ "deleted": true, "id": 7 }
```

Accessing another user's account → `403`:

```json
{ "statusCode": 403, "message": "You do not own this account", "error": "Forbidden" }
```

---

## Categories  (auth required; DELETE is admin-only)

### POST /categories

```bash
curl -X POST http://localhost:3000/categories \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Health","type":"expense"}'
```

```json
{ "id": 8, "name": "Health", "type": "expense" }
```

### GET /categories

```bash
curl http://localhost:3000/categories -H "Authorization: Bearer $TOKEN"
```

```json
[ { "id": 1, "name": "Salary", "type": "income" }, { "id": 3, "name": "Groceries", "type": "expense" } ]
```

### GET /categories/:id

```json
{ "id": 3, "name": "Groceries", "type": "expense" }
```

### PATCH /categories/:id

```bash
curl -X PATCH http://localhost:3000/categories/8 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Healthcare"}'
```

```json
{ "id": 8, "name": "Healthcare", "type": "expense" }
```

### DELETE /categories/:id  (admin only)

```bash
curl -X DELETE http://localhost:3000/categories/8 -H "Authorization: Bearer $ADMIN_TOKEN"
```

```json
{ "deleted": true, "id": 8 }
```

Non-admin attempt → `403`:

```json
{ "statusCode": 403, "message": "Insufficient role to perform this action", "error": "Forbidden" }
```

---

## Transactions  (all require auth + ownership; balance recalculated on write)

### POST /transactions

```bash
curl -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"accountId":1,"categoryId":3,"type":"expense","amount":75000,"description":"Snacks","transactionDate":"2026-02-21"}'
```

```json
{
  "id": 23, "accountId": 1, "categoryId": 3, "type": "expense", "amount": "75000",
  "description": "Snacks", "transactionDate": "2026-02-21T00:00:00.000Z",
  "category": { "id": 3, "name": "Groceries", "type": "expense" }
}
```

Validation error (negative amount → `400`):

```json
{ "statusCode": 400, "message": ["amount must be a positive number"], "error": "Bad Request" }
```

### GET /transactions

```bash
curl http://localhost:3000/transactions -H "Authorization: Bearer $TOKEN"
```

Optional inclusive filters can be combined: `categoryId`, `type`, `minAmount`,
`maxAmount`, `fromDate`, and `toDate`.

```bash
curl "http://localhost:3000/transactions?categoryId=3&type=expense&minAmount=50000&maxAmount=500000&fromDate=2026-02-01&toDate=2026-02-28" \\
  -H "Authorization: Bearer $TOKEN"
```

```json
[ { "id": 23, "accountId": 1, "categoryId": 3, "type": "expense", "amount": "75000", "description": "Snacks", "transactionDate": "2026-02-21T00:00:00.000Z", "category": { "id": 3, "name": "Groceries", "type": "expense" } } ]
```

### GET /transactions/:id

```json
{ "id": 23, "accountId": 1, "categoryId": 3, "type": "expense", "amount": "75000", "description": "Snacks", "transactionDate": "2026-02-21T00:00:00.000Z", "account": { "id": 1, "userId": 1, "name": "Alice Cash", "type": "cash", "balance": "425000", "createdAt": "2026-01-01T00:00:00.000Z" }, "category": { "id": 3, "name": "Groceries", "type": "expense" } }
```

### PATCH /transactions/:id  (balance re-adjusted automatically)

```bash
curl -X PATCH http://localhost:3000/transactions/23 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"amount":90000}'
```

```json
{ "id": 23, "accountId": 1, "categoryId": 3, "type": "expense", "amount": "90000", "description": "Snacks", "transactionDate": "2026-02-21T00:00:00.000Z", "category": { "id": 3, "name": "Groceries", "type": "expense" } }
```

### DELETE /transactions/:id  (balance reverted automatically)

```bash
curl -X DELETE http://localhost:3000/transactions/23 -H "Authorization: Bearer $TOKEN"
```

```json
{ "deleted": true, "id": 23 }
```
