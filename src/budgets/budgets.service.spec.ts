import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from './budgets.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  const prisma = {
    category: { findUnique: jest.fn() },
    budget: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
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
});
