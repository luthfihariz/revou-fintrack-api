import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceCalculatorService } from './balance-calculator.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceCalculatorService,
  ) {}

  // Create a transaction and recalculate the owning account's balance atomically.
  async create(userId: number, dto: CreateTransactionDto) {
    this.logger.log(`Creating transaction for user ${userId} on account ${dto.accountId}`);

    try {
      await this.assertAccountOwned(userId, dto.accountId);
      await this.assertCategoryExists(dto.categoryId);

      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            accountId: dto.accountId,
            categoryId: dto.categoryId,
            type: dto.type,
            amount: dto.amount,
            description: dto.description,
            transactionDate: new Date(dto.transactionDate),
          },
          include: { category: true },
        });
        await this.balance.applyToAccount(tx, created.accountId, created.type, created.amount);
        this.logger.log(`Created transaction ${created.id} for account ${created.accountId}`);
        return created;
      });
    } catch (error) {
      this.logger.error(
        `Failed to create transaction for user ${userId} on account ${dto.accountId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // Only transactions belonging to the user's accounts are listed.
  findAll(userId: number) {
    return this.prisma.transaction.findMany({
      where: { account: { userId } },
      include: { category: true },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async findOne(userId: number, id: number) {
    return this.getOwned(userId, id);
  }

  // Update a transaction: revert the old effect, then apply the new one.
  async update(userId: number, id: number, dto: UpdateTransactionDto) {
    this.logger.log(`Updating transaction ${id} for user ${userId}`);

    try {
      const existing = await this.getOwned(userId, id);

      const targetAccountId = dto.accountId ?? existing.accountId;
      if (dto.accountId && dto.accountId !== existing.accountId) {
        await this.assertAccountOwned(userId, dto.accountId);
      }
      if (dto.categoryId) {
        await this.assertCategoryExists(dto.categoryId);
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Undo the previous balance effect on the original account.
        await this.balance.revertFromAccount(
          tx,
          existing.accountId,
          existing.type,
          existing.amount,
        );

        const updated = await tx.transaction.update({
          where: { id },
          data: {
            accountId: dto.accountId,
            categoryId: dto.categoryId,
            type: dto.type,
            amount: dto.amount,
            description: dto.description,
            transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : undefined,
          },
          include: { category: true },
        });

        // Apply the new effect on the (possibly changed) target account.
        await this.balance.applyToAccount(tx, targetAccountId, updated.type, updated.amount);
        this.logger.log(`Updated transaction ${updated.id} on account ${updated.accountId}`);
        return updated;
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update transaction ${id} for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // Delete a transaction and revert its balance effect.
  async remove(userId: number, id: number) {
    this.logger.log(`Removing transaction ${id} for user ${userId}`);

    try {
      const existing = await this.getOwned(userId, id);

      await this.prisma.$transaction(async (tx) => {
        await this.balance.revertFromAccount(
          tx,
          existing.accountId,
          existing.type,
          existing.amount,
        );
        await tx.transaction.delete({ where: { id } });
      });

      this.logger.log(`Deleted transaction ${id} for user ${userId}`);
      return { deleted: true, id };
    } catch (error) {
      this.logger.error(
        `Failed to remove transaction ${id} for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // --- ownership / existence helpers ---------------------------------------

  private async getOwned(userId: number, id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { account: true, category: true },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    if (transaction.account.userId !== userId) {
      throw new ForbiddenException('You do not own this transaction');
    }
    return transaction;
  }

  private async assertAccountOwned(userId: number, accountId: number) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not own the target account');
    }
  }

  private async assertCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }
  }
}
