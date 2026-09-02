---
name: test-driven-development
description: 'Test-driven development (TDD) workflow for implementing and planning features. Use when implementing new service features, fixing bugs, or planning architecture. Follow: write test → run (fail) → implement → run (pass) → refactor → verify. Includes test planning, unit test patterns, happy path and edge case coverage.'
argument-hint: 'feature name or user story'
user-invocable: true
---

# Test-Driven Development

## When to Use

- **Implementing new features** in services (business logic, data access, calculations)
- **Planning feature architecture** — start by writing test plans
- **Fixing bugs** — write a failing test that reproduces the bug, then fix
- **Refactoring** — ensure tests pass before and after changes
- **Ensuring quality** — comprehensive test coverage catches regressions early

## Core TDD Workflow

### Phase 1: Plan with Tests
Before writing any implementation code, write a **test plan** that outlines:
- **Happy path**: The expected behavior under normal conditions
- **Edge cases**: Boundary conditions, invalid inputs, error states
- **Integration points**: How the service interacts with dependencies (Prisma, other services)

### Phase 2: Write Failing Tests
1. Create a test file (e.g., `service.spec.ts`)
2. Import the service and its dependencies
3. Write test cases for each scenario in your test plan
4. **Run the tests and confirm they all fail** — this verifies your test catches missing functionality

### Phase 3: Implement to Pass
1. Add the minimal implementation needed to make tests pass
2. Focus on correctness, not perfection
3. Use NestJS and Prisma conventions (see [Conventions Reference](#nestjs-conventions))
4. Run tests frequently to check progress

### Phase 4: Refactor
1. Improve code clarity, performance, and maintainability
2. Follow NestJS conventions, DRY principles, and the project style
3. Run tests after each refactor to ensure nothing broke

### Phase 5: Verify and Document
1. Confirm all tests still pass
2. Verify test coverage is adequate
3. Document any complex logic or edge cases in comments

## Test Plan Template

For any feature, start by filling in this template:

```
Feature: [Feature Name]
Description: [What it does]

Happy Path:
- Scenario 1: [Expected behavior with typical inputs]
- Scenario 2: [Another typical flow]

Edge Cases:
- Boundary condition: [e.g., zero, negative, max value]
- Invalid input: [e.g., null, empty, wrong type]
- Resource not found: [e.g., user/account doesn't exist]
- Permission denied: [e.g., user is not owner]
- Concurrent operations: [e.g., race condition]
- External dependency failure: [e.g., database error]

Test Cases to Implement:
1. test("should [scenario 1]", ...)
2. test("should [scenario 2]", ...)
3. test("should throw when [edge case]", ...)
... (one for each scenario)
```

## Example: Service Method Testing

Here's how to structure a unit test for a NestJS service method:

### Test File Structure

```typescript
// src/domain/domain.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DomainService } from './domain.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DomainService', () => {
  let service: DomainService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainService,
        {
          provide: PrismaService,
          useValue: {
            // Mock methods used by the service
            model: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<DomainService>(DomainService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createResource', () => {
    it('should create a resource with valid input', async () => {
      // Arrange
      const createDto = { name: 'Test', value: 100 };
      const expected = { id: '1', ...createDto, createdAt: new Date() };
      jest.spyOn(prisma.model, 'create').mockResolvedValue(expected);

      // Act
      const result = await service.createResource(createDto);

      // Assert
      expect(result).toEqual(expected);
      expect(prisma.model.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw error when required field is missing', async () => {
      // Arrange
      const invalidDto = { value: 100 }; // missing 'name'

      // Act & Assert
      await expect(service.createResource(invalidDto)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const createDto = { name: 'Test', value: 100 };
      jest.spyOn(prisma.model, 'create')
        .mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.createResource(createDto)).rejects.toThrow();
    });
  });
});
```

## Writing Effective Unit Tests

### Arrange-Act-Assert Pattern
Every test should follow this structure:

```typescript
it('should [expected behavior]', async () => {
  // Arrange: Set up test data and mocks
  const input = { ... };
  jest.spyOn(prisma.user, 'findUnique')
    .mockResolvedValue(testUser);

  // Act: Call the method under test
  const result = await service.doSomething(input);

  // Assert: Verify the result
  expect(result).toEqual(expected);
  expect(prisma.user.findUnique).toHaveBeenCalledWith({
    where: { id: userId },
  });
});
```

### Happy Path Tests
Test the primary, expected behavior:

```typescript
it('should create account with valid input', async () => {
  const createDto = { name: 'Savings', type: 'SAVINGS' };
  const userId = 'user-1';

  jest.spyOn(prisma.account, 'create').mockResolvedValue({
    id: 'acc-1',
    ...createDto,
    userId,
    balance: new Decimal('0'),
    createdAt: new Date(),
  });

  const result = await service.create(userId, createDto);

  expect(result.name).toBe('Savings');
  expect(prisma.account.create).toHaveBeenCalled();
});
```

### Edge Case Tests
Test boundary conditions and invalid inputs:

```typescript
// Boundary conditions
it('should handle zero balance', async () => { /* ... */ });
it('should handle maximum currency amount', async () => { /* ... */ });

// Invalid inputs
it('should reject negative amount', async () => {
  const invalidDto = { amount: -100 };
  await expect(service.create(userId, invalidDto))
    .rejects.toThrow('Amount must be positive');
});

it('should reject null values', async () => {
  const invalidDto = { name: null };
  await expect(service.create(userId, invalidDto))
    .rejects.toThrow();
});

// Not found
it('should throw when user does not exist', async () => {
  jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
  await expect(service.create('non-existent-id', {}))
    .rejects.toThrow('User not found');
});

// Permission checks
it('should throw when user is not account owner', async () => {
  const otherUserId = 'different-user';
  const account = { id: 'acc-1', userId: 'owner-id' };
  
  jest.spyOn(prisma.account, 'findUnique')
    .mockResolvedValue(account);

  await expect(service.update(otherUserId, 'acc-1', {}))
    .rejects.toThrow('Unauthorized');
});

// Error handling
it('should propagate database errors', async () => {
  jest.spyOn(prisma.account, 'create')
    .mockRejectedValue(new Error('Database error'));

  await expect(service.create(userId, {}))
    .rejects.toThrow('Database error');
});
```

### Testing Calculations and Business Logic
For complex calculations or transformations:

```typescript
describe('balance-calculator', () => {
  describe('calculateBalance', () => {
    it('should add income transactions to balance', () => {
      const transactions = [
        { type: 'INCOME', amount: new Decimal('100') },
        { type: 'INCOME', amount: new Decimal('50') },
      ];
      
      const balance = service.calculateBalance(transactions);
      
      expect(balance).toEqual(new Decimal('150'));
    });

    it('should subtract expense transactions from balance', () => {
      const transactions = [
        { type: 'EXPENSE', amount: new Decimal('30') },
        { type: 'EXPENSE', amount: new Decimal('20') },
      ];
      
      const balance = service.calculateBalance(transactions);
      
      expect(balance).toEqual(new Decimal('-50'));
    });

    it('should handle mixed transaction types', () => {
      const transactions = [
        { type: 'INCOME', amount: new Decimal('100') },
        { type: 'EXPENSE', amount: new Decimal('30') },
        { type: 'INCOME', amount: new Decimal('50') },
      ];
      
      const balance = service.calculateBalance(transactions);
      
      expect(balance).toEqual(new Decimal('120'));
    });

    it('should handle empty transaction list', () => {
      const balance = service.calculateBalance([]);
      
      expect(balance).toEqual(new Decimal('0'));
    });

    it('should handle decimal precision correctly', () => {
      const transactions = [
        { type: 'INCOME', amount: new Decimal('0.01') },
        { type: 'INCOME', amount: new Decimal('0.02') },
      ];
      
      const balance = service.calculateBalance(transactions);
      
      expect(balance).toEqual(new Decimal('0.03'));
    });
  });
});
```

### Testing Transactions and Atomicity
When testing methods that use `prisma.$transaction`:

```typescript
it('should atomically create account and initialize balance', async () => {
  const userId = 'user-1';
  const initialBalance = new Decimal('1000');

  jest.spyOn(prisma, '$transaction').mockImplementation(
    async (callback) => {
      return callback(prisma);
    }
  );

  jest.spyOn(prisma.account, 'create').mockResolvedValue({
    id: 'acc-1',
    userId,
    balance: initialBalance,
  });

  const result = await service.create(userId, {
    name: 'Main',
    initialBalance,
  });

  expect(prisma.$transaction).toHaveBeenCalled();
  expect(result.balance).toEqual(initialBalance);
});

it('should rollback on error during transaction', async () => {
  jest.spyOn(prisma, '$transaction')
    .mockRejectedValue(new Error('Transaction failed'));

  await expect(service.create(userId, {}))
    .rejects.toThrow('Transaction failed');
});
```

## NestJS Conventions

### Service Method Testing Checklist
- [ ] Mock PrismaService correctly using `jest.spyOn`
- [ ] Test both success and error paths
- [ ] Verify Prisma methods are called with correct arguments
- [ ] Use Decimal type for monetary values
- [ ] Test authorization (ownership, roles) in service layer
- [ ] Test Prisma transactions with proper mocking
- [ ] Handle and test error scenarios (not found, permission denied, etc.)
- [ ] Clean up mocks in `afterEach`
- [ ] Use meaningful test descriptions ("should..." pattern)

### Recommended Test File Location
```
src/
  domain/
    domain.service.ts          # Implementation
    domain.service.spec.ts     # Unit tests (same folder)
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- domain.service.spec.ts

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

## Common Testing Patterns in FinTrack

### Testing with Ownership Checks
```typescript
it('should throw if user is not account owner', async () => {
  const account = { id: 'acc-1', userId: 'owner-id' };
  jest.spyOn(prisma.account, 'findUnique')
    .mockResolvedValue(account);

  const requesterUserId = 'different-user';
  await expect(service.update(requesterUserId, 'acc-1', {}))
    .rejects.toThrow('Unauthorized');
});
```

### Testing with Role-Based Guards
```typescript
it('should allow admin to delete category', async () => {
  const admin = { id: 'admin-1', role: 'ADMIN' };
  jest.spyOn(prisma.user, 'findUnique')
    .mockResolvedValue(admin);

  await service.delete('cat-1', admin);

  expect(prisma.category, 'delete').toHaveBeenCalledWith({
    where: { id: 'cat-1' },
  });
});

it('should throw for non-admin deleting category', async () => {
  const user = { id: 'user-1', role: 'USER' };
  await expect(service.delete('cat-1', user))
    .rejects.toThrow('Forbidden');
});
```

### Testing Balance Updates
```typescript
it('should correctly update balance for income transaction', async () => {
  const transaction = {
    id: 'tx-1',
    type: 'INCOME',
    amount: new Decimal('100'),
    accountId: 'acc-1',
  };

  jest.spyOn(prisma.account, 'update')
    .mockResolvedValue({
      id: 'acc-1',
      balance: new Decimal('500'), // increased
    });

  const result = await service.create(userId, transaction);

  expect(prisma.account.update).toHaveBeenCalledWith({
    where: { id: 'acc-1' },
    data: { balance: new Decimal('500') },
  });
});
```

## Step-by-Step Feature Implementation Guide

### 1. Write Test Plan
Start with a feature requirement. Create a test plan:
```
Feature: Transfer funds between accounts
Happy Path:
- Transfer with valid amount and both accounts owned by user
- Verify source account balance decreases
- Verify destination account balance increases

Edge Cases:
- Insufficient balance in source account
- Negative or zero transfer amount
- Source and destination are same account
- Destination account not found
- Source account not found
- User doesn't own one or both accounts
```

### 2. Create Test File
Create `transfers.service.spec.ts` and write all test cases (they will fail):
```typescript
describe('TransfersService', () => {
  // ... beforeEach setup

  describe('transfer', () => {
    it('should transfer funds between accounts', async () => { /* ... */ });
    it('should throw when insufficient balance', async () => { /* ... */ });
    it('should throw when amount is zero', async () => { /* ... */ });
    it('should throw when source account not found', async () => { /* ... */ });
    // ... more edge cases
  });
});
```

Run tests: `npm test -- transfers.service.spec.ts`
Confirm all fail. ✅

### 3. Implement Service
Create `transfers.service.ts` and implement the minimum to pass tests:
```typescript
@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async transfer(
    userId: string,
    sourceId: string,
    destinationId: string,
    amount: Decimal,
  ): Promise<Transfer> {
    // Validation
    if (!amount || amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount must be positive');
    }

    // Fetch accounts
    const source = await this.prisma.account.findUnique({
      where: { id: sourceId },
    });
    if (!source || source.userId !== userId) {
      throw new ForbiddenException('Cannot access source account');
    }

    const destination = await this.prisma.account.findUnique({
      where: { id: destinationId },
    });
    if (!destination) {
      throw new NotFoundException('Destination account not found');
    }

    // Check balance
    if (source.balance.lessThan(amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Perform transfer
    return this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: sourceId },
        data: { balance: { decrement: amount } },
      });

      await tx.account.update({
        where: { id: destinationId },
        data: { balance: { increment: amount } },
      });

      return tx.transfer.create({
        data: {
          sourceId,
          destinationId,
          amount,
          userId,
        },
      });
    });
  }
}
```

Run tests: `npm test -- transfers.service.spec.ts`
Confirm all pass. ✅

### 4. Refactor
- Improve error messages
- Extract validation into separate method
- Add logging
- Ensure consistent with project style

### 5. Verify
- Run full test suite: `npm test`
- Check coverage: `npm test -- --coverage`
- Run linting: `npm run lint`
- Commit changes

## Testing Checklist

Before marking a feature complete:

- [ ] Test plan written and documented in commit message or PR
- [ ] All unit tests written and passing
- [ ] Happy path covered with at least one test
- [ ] Edge cases covered (invalid input, not found, unauthorized, etc.)
- [ ] Error handling tested (exceptions thrown with correct messages)
- [ ] Mocks verify correct Prisma calls
- [ ] Service layer tests only (no controller-level tests)
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] Test names clearly describe expected behavior
- [ ] No hardcoded test data (use variables for clarity)
- [ ] Mock cleanup in `afterEach`
- [ ] Decimal type used for money (not Float)
- [ ] Ownership checks tested
- [ ] Atomic transactions tested where applicable
- [ ] Coverage is 80%+ for business logic
- [ ] Code refactored and follows conventions
- [ ] All tests still passing after refactor

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [FinTrack API Conventions](../../../AGENTS.md)

## Related Commands

- `npm test` — Run all tests
- `npm test -- --watch` — Watch mode
- `npm test -- --coverage` — Coverage report
- `npm run lint` — Check code style
- `npm run format` — Auto-format code
