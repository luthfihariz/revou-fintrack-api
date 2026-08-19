import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';

// Custom provider (separate from the default service) that owns all balance math.
// Injected into TransactionsService. Keeps balance recalculation out of controllers.
@Injectable()
export class BalanceCalculatorService {
  // Signed effect of a transaction on its account balance:
  //   income   -> +amount
  //   expense  -> -amount
  //   transfer -> 0 (net-neutral for a single account in this simplified model)
  signedAmount(type: TransactionType, amount: Prisma.Decimal | number): Prisma.Decimal {
    const value = new Prisma.Decimal(amount);
    switch (type) {
      case TransactionType.income:
        return value;
      case TransactionType.expense:
        return value.negated();
      default:
        return new Prisma.Decimal(0);
    }
  }

  // Apply a transaction's effect to an account balance (used on create).
  async applyToAccount(
    tx: Prisma.TransactionClient,
    accountId: number,
    type: TransactionType,
    amount: Prisma.Decimal | number,
  ): Promise<void> {
    await this.adjust(tx, accountId, this.signedAmount(type, amount));
  }

  // Remove a transaction's previous effect (used on update/delete).
  async revertFromAccount(
    tx: Prisma.TransactionClient,
    accountId: number,
    type: TransactionType,
    amount: Prisma.Decimal | number,
  ): Promise<void> {
    await this.adjust(tx, accountId, this.signedAmount(type, amount).negated());
  }

  private async adjust(
    tx: Prisma.TransactionClient,
    accountId: number,
    delta: Prisma.Decimal,
  ): Promise<void> {
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    });
  }
}
