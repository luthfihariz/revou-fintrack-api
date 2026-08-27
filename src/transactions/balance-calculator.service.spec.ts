import { Prisma, TransactionType } from '@prisma/client';
import { BalanceCalculatorService } from './balance-calculator.service';

describe('BalanceCalculatorService', () => {
  let service: BalanceCalculatorService;
  const tx = {
    account: { update: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BalanceCalculatorService();
  });

  it('returns positive Decimal values for income', () => {
    expect(service.signedAmount(TransactionType.income, 125.5)).toEqual(
      new Prisma.Decimal('125.5'),
    );
  });

  it('returns negative Decimal values for expenses', () => {
    expect(service.signedAmount(TransactionType.expense, new Prisma.Decimal('40.25'))).toEqual(
      new Prisma.Decimal('-40.25'),
    );
  });

  it('returns zero for transfers', () => {
    expect(service.signedAmount(TransactionType.transfer, 75)).toEqual(new Prisma.Decimal(0));
  });

  it('increments an account by the signed transaction amount', async () => {
    await service.applyToAccount(
      tx as unknown as Prisma.TransactionClient,
      4,
      TransactionType.expense,
      20,
    );

    expect(tx.account.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { balance: { increment: new Prisma.Decimal(-20) } },
    });
  });

  it('increments an account by the inverse of the previous effect when reverting', async () => {
    await service.revertFromAccount(
      tx as unknown as Prisma.TransactionClient,
      4,
      TransactionType.income,
      new Prisma.Decimal('20.75'),
    );

    expect(tx.account.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { balance: { increment: new Prisma.Decimal('-20.75') } },
    });
  });
});