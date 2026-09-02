import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from './budgets.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    category: { findUnique: jest.fn() },
    budget: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    transaction: { aggregate: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a budget for an existing category', async () => {
    const category = { id: 3, name: 'Food', type: 'expense' };
    const createdBudget = { id: 1, categoryId: 3, userId: 7 };
    prisma.category.findUnique.mockResolvedValue(category);
    prisma.budget.create.mockResolvedValue(createdBudget);

    await expect(
      service.create(7, {
        categoryId: 3,
        month: 8,
        year: 2026,
        limitAmount: 500,
      }),
    ).resolves.toBe(createdBudget);

    expect(prisma.budget.create).toHaveBeenCalledWith({
      data: {
        userId: 7,
        categoryId: 3,
        month: 8,
        year: 2026,
        limitAmount: 500,
      },
      include: { category: true },
    });
  });

  it('throws when the category does not exist', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(
      service.create(7, {
        categoryId: 99,
        month: 8,
        year: 2026,
        limitAmount: 500,
      }),
    ).rejects.toThrow(new NotFoundException('Category 99 not found'));

    expect(prisma.budget.create).not.toHaveBeenCalled();
  });

  it.each([0, 13])('throws when the month is %d', async (month) => {
    await expect(
      service.create(7, {
        categoryId: 3,
        month,
        year: 2026,
        limitAmount: 500,
      }),
    ).rejects.toThrow(new BadRequestException('Month must be between 1 and 12'));

    expect(prisma.category.findUnique).not.toHaveBeenCalled();
    expect(prisma.budget.create).not.toHaveBeenCalled();
  });

  it('removes an owned budget', async () => {
    const budget = { id: 1, userId: 7, categoryId: 3 };
    prisma.budget.findUnique.mockResolvedValue(budget);
    prisma.budget.delete.mockResolvedValue(budget);

    await expect(service.remove(7, 1)).resolves.toEqual({ deleted: true, id: 1 });

    expect(prisma.budget.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { category: true },
    });
    expect(prisma.budget.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('throws when the budget does not exist', async () => {
    prisma.budget.findUnique.mockResolvedValue(null);

    await expect(service.remove(7, 99)).rejects.toThrow(
      new NotFoundException('Budget 99 not found'),
    );

    expect(prisma.budget.delete).not.toHaveBeenCalled();
  });

  it('throws when the budget belongs to another user', async () => {
    prisma.budget.findUnique.mockResolvedValue({ id: 1, userId: 8 });

    await expect(service.remove(7, 1)).rejects.toThrow('You do not own this budget');

    expect(prisma.budget.delete).not.toHaveBeenCalled();
  });

  describe('findBudgetInsights', () => {
    it('should return insights for all budgets with correct calculations', async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const mockBudgets = [
        {
          id: 1,
          month: currentMonth,
          year: currentYear,
          limitAmount: new Prisma.Decimal(5000),
          categoryId: 10,
          userId: 7,
          category: { id: 10, name: 'Travel', type: 'expense' },
        },
        {
          id: 2,
          month: currentMonth,
          year: currentYear,
          limitAmount: new Prisma.Decimal(1000),
          categoryId: 11,
          userId: 7,
          category: { id: 11, name: 'Food', type: 'expense' },
        },
      ];

      prisma.budget.findMany.mockResolvedValue(mockBudgets);

      // Mock transaction aggregates for each budget
      // Budget 1: spent 4000 (80%)
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(4000) } })
        // Budget 2: spent 500 (50%)
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(500) } });

      const result = await service.findBudgetInsights(7);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockBudgets[0],
        spent: new Prisma.Decimal(4000),
        remaining: new Prisma.Decimal(1000),
        usagePercentage: 80,
      });
      expect(result[1]).toEqual({
        ...mockBudgets[1],
        spent: new Prisma.Decimal(500),
        remaining: new Prisma.Decimal(500),
        usagePercentage: 50,
      });
    });

    it('should return empty array when user has no budgets for current month/year', async () => {
      prisma.budget.findMany.mockResolvedValue([]);

      const result = await service.findBudgetInsights(7);

      expect(result).toEqual([]);
      expect(prisma.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 7,
          }),
        }),
      );
    });

    it('should handle budget with no transactions (0% usage)', async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const mockBudget = {
        id: 1,
        month: currentMonth,
        year: currentYear,
        limitAmount: new Prisma.Decimal(2000),
        categoryId: 10,
        userId: 7,
        category: { id: 10, name: 'Travel', type: 'expense' },
      };

      prisma.budget.findMany.mockResolvedValue([mockBudget]);
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.findBudgetInsights(7);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...mockBudget,
        spent: new Prisma.Decimal(0),
        remaining: new Prisma.Decimal(2000),
        usagePercentage: 0,
      });
    });

    it('should handle budget overspending (>100% usage)', async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const mockBudget = {
        id: 1,
        month: currentMonth,
        year: currentYear,
        limitAmount: new Prisma.Decimal(1000),
        categoryId: 10,
        userId: 7,
        category: { id: 10, name: 'Travel', type: 'expense' },
      };

      prisma.budget.findMany.mockResolvedValue([mockBudget]);
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(1500) } });

      const result = await service.findBudgetInsights(7);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...mockBudget,
        spent: new Prisma.Decimal(1500),
        remaining: new Prisma.Decimal(-500),
        usagePercentage: 150,
      });
    });

    it('should exclude transfers from calculation', async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const mockBudget = {
        id: 1,
        month: currentMonth,
        year: currentYear,
        limitAmount: new Prisma.Decimal(1000),
        categoryId: 10,
        userId: 7,
        category: { id: 10, name: 'Travel', type: 'expense' },
      };

      prisma.budget.findMany.mockResolvedValue([mockBudget]);
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(500) } });

      const result = await service.findBudgetInsights(7);

      // Verify that the query filtered for 'income' and 'expense' types only
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ['income', 'expense'] },
          }),
        }),
      );

      expect(result[0].usagePercentage).toBe(50);
    });
  });
});
