import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BalanceCalculatorService } from "./balance-calculator.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceCalculatorService,
  ) {}

  // Create a transaction and recalculate the owning account's balance atomically.
  async create(userId: number, dto: CreateTransactionDto) {
    this.logger.log(`Creating transaction for user ${userId}`);
    try {
      await this.assertAccountOwned(userId, dto.accountId);
      await this.assertCategoryExists(userId, dto.categoryId);
      const created = await this.executeQuery(
        `transaction.create accountId=${dto.accountId}`,
        userId,
        this.prisma.$transaction(async (tx) => {
          const transaction = await this.executeQuery(
            "transaction.create",
            userId,
            tx.transaction.create({
              data: {
                accountId: dto.accountId,
                categoryId: dto.categoryId,
                type: dto.type,
                amount: dto.amount,
                description: dto.description,
                transactionDate: new Date(dto.transactionDate),
              },
              include: { category: true },
            }),
          );
          await this.balance.applyToAccount(
            tx,
            transaction.accountId,
            transaction.type,
            transaction.amount,
          );
          return transaction;
        }),
      );
      this.logger.log(`Transaction created for user ${userId}: ${created.id}`);
      return created;
    } catch (error) {
      this.logError("create transaction", userId, error);
      throw error;
    }
  }

  // Only transactions belonging to the user's accounts are listed.
  async findAll(userId: number) {
    try {
      const transactions = await this.executeQuery(
        "transaction.findMany",
        userId,
        this.prisma.transaction.findMany({
          where: { account: { userId } },
          include: { category: true },
          orderBy: { transactionDate: "desc" },
        }),
      );
      this.logger.log(
        `Transactions listed for user ${userId}: ${transactions.length}`,
      );
      return transactions;
    } catch (error) {
      this.logError("list transactions", userId, error);
      throw error;
    }
  }

  async findOne(userId: number, id: number) {
    try {
      const transaction = await this.getOwned(userId, id);
      this.logger.log(`Transaction retrieved for user ${userId}: ${id}`);
      return transaction;
    } catch (error) {
      this.logError(`retrieve transaction ${id}`, userId, error);
      throw error;
    }
  }

  // Update a transaction: revert the old effect, then apply the new one.
  async update(userId: number, id: number, dto: UpdateTransactionDto) {
    try {
      const existing = await this.getOwned(userId, id);
      const targetAccountId = dto.accountId ?? existing.accountId;
      if (dto.accountId && dto.accountId !== existing.accountId) {
        await this.assertAccountOwned(userId, dto.accountId);
      }
      if (dto.categoryId) {
        await this.assertCategoryExists(userId, dto.categoryId);
      }

      const updated = await this.executeQuery(
        `transaction.update id=${id}`,
        userId,
        this.prisma.$transaction(async (tx) => {
          await this.balance.revertFromAccount(
            tx,
            existing.accountId,
            existing.type,
            existing.amount,
          );
          const transaction = await this.executeQuery(
            "transaction.update",
            userId,
            tx.transaction.update({
              where: { id },
              data: {
                accountId: dto.accountId,
                categoryId: dto.categoryId,
                type: dto.type,
                amount: dto.amount,
                description: dto.description,
                transactionDate: dto.transactionDate
                  ? new Date(dto.transactionDate)
                  : undefined,
              },
              include: { category: true },
            }),
          );
          await this.balance.applyToAccount(
            tx,
            targetAccountId,
            transaction.type,
            transaction.amount,
          );
          return transaction;
        }),
      );
      this.logger.log(`Transaction updated for user ${userId}: ${id}`);
      return updated;
    } catch (error) {
      this.logError(`update transaction ${id}`, userId, error);
      throw error;
    }
  }

  // Delete a transaction and revert its balance effect.
  async remove(userId: number, id: number) {
    try {
      const existing = await this.getOwned(userId, id);
      await this.executeQuery(
        `transaction.delete id=${id}`,
        userId,
        this.prisma.$transaction(async (tx) => {
          await this.balance.revertFromAccount(
            tx,
            existing.accountId,
            existing.type,
            existing.amount,
          );
          await this.executeQuery(
            "transaction.delete",
            userId,
            tx.transaction.delete({ where: { id } }),
          );
        }),
      );
      this.logger.log(`Transaction deleted for user ${userId}: ${id}`);
      return { deleted: true, id };
    } catch (error) {
      this.logError(`delete transaction ${id}`, userId, error);
      throw error;
    }
  }

  // --- ownership / existence helpers ---------------------------------------

  private async getOwned(userId: number, id: number) {
    const transaction = await this.executeQuery(
      `transaction.findUnique id=${id}`,
      userId,
      this.prisma.transaction.findUnique({
        where: { id },
        include: { account: true, category: true },
      }),
    );
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    if (transaction.account.userId !== userId) {
      throw new ForbiddenException("You do not own this transaction");
    }
    return transaction;
  }

  private async assertAccountOwned(userId: number, accountId: number) {
    const account = await this.executeQuery(
      `account.findUnique id=${accountId}`,
      userId,
      this.prisma.account.findUnique({ where: { id: accountId } }),
    );
    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }
    if (account.userId !== userId) {
      throw new ForbiddenException("You do not own the target account");
    }
  }

  private async assertCategoryExists(userId: number, categoryId: number) {
    const category = await this.executeQuery(
      `category.findUnique id=${categoryId}`,
      userId,
      this.prisma.category.findUnique({ where: { id: categoryId } }),
    );
    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }
  }

  private async executeQuery<T>(
    operation: string,
    userId: number,
    query: Promise<T>,
  ): Promise<T> {
    try {
      return await query;
    } catch (error) {
      this.logError(operation, userId, error);
      throw error;
    }
  }

  private logError(
    operation: string,
    userId: number | undefined,
    error: unknown,
  ) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(
      `${operation} failed${userId === undefined ? "" : ` for user ${userId}`}: ${message}`,
      stack,
    );
  }
}
