import {
	BadRequestException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { BudgetsService } from './budgets.service';

describe('BudgetsService', () => {
	let service: BudgetsService;
	const prisma = {
		category: {
			findUnique: jest.fn(),
		},
		budget: {
			create: jest.fn(),
			findUnique: jest.fn(),
			delete: jest.fn(),
		},
	};

	beforeEach(async () => {
		jest.clearAllMocks();
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BudgetsService,
				{
					provide: PrismaService,
					useValue: prisma,
				},
			],
		}).compile();

		service = module.get<BudgetsService>(BudgetsService);
	});

	it('creates a budget for an existing category', async () => {
		const userId = 7;
		const dto: CreateBudgetDto = {
			month: 8,
			year: 2026,
			limitAmount: 1500,
			categoryId: 3,
		};
		const createdBudget = { id: 1, ...dto, userId };
		prisma.category.findUnique.mockResolvedValue({ id: dto.categoryId });
		prisma.budget.create.mockResolvedValue(createdBudget);

		const result = await service.create(userId, dto);

		expect(prisma.category.findUnique).toHaveBeenCalledWith({
			where: { id: dto.categoryId },
		});
		expect(prisma.budget.create).toHaveBeenCalledWith({
			data: {
				month: dto.month,
				year: dto.year,
				limitAmount: dto.limitAmount,
				categoryId: dto.categoryId,
				userId,
			},
		});
		expect(result).toEqual(createdBudget);
	});

	it('throws when the category does not exist', async () => {
		const userId = 7;
		const dto: CreateBudgetDto = {
			month: 8,
			year: 2026,
			limitAmount: 1500,
			categoryId: 999,
		};
		prisma.category.findUnique.mockResolvedValue(null);

		await expect(service.create(userId, dto)).rejects.toEqual(
			new NotFoundException(`Category ${dto.categoryId} not found`),
		);
		expect(prisma.budget.create).not.toHaveBeenCalled();
	});

	it.each([0, 13])('throws when the month is %i', async (month) => {
		const dto: CreateBudgetDto = {
			month,
			year: 2026,
			limitAmount: 1500,
			categoryId: 3,
		};

		await expect(service.create(7, dto)).rejects.toEqual(
			new BadRequestException('Month must be between 1 and 12'),
		);
		expect(prisma.category.findUnique).not.toHaveBeenCalled();
		expect(prisma.budget.create).not.toHaveBeenCalled();
	});

	it('removes a budget owned by the user', async () => {
		const userId = 7;
		const budgetId = 1;
		const budget = { id: budgetId, userId };
		prisma.budget.findUnique.mockResolvedValue(budget);

		const result = await service.remove(userId, budgetId);

		expect(prisma.budget.findUnique).toHaveBeenCalledWith({
			where: { id: budgetId },
		});
		expect(prisma.budget.delete).toHaveBeenCalledWith({
			where: { id: budgetId },
		});
		expect(result).toEqual({ deleted: true, id: budgetId });
	});

	it('throws when the budget is not found', async () => {
		const budgetId = 999;
		prisma.budget.findUnique.mockResolvedValue(null);

		await expect(service.remove(7, budgetId)).rejects.toEqual(
			new NotFoundException(`Budget ${budgetId} not found`),
		);
		expect(prisma.budget.delete).not.toHaveBeenCalled();
	});

	it('throws when the budget belongs to another user', async () => {
		const budgetId = 1;
		prisma.budget.findUnique.mockResolvedValue({
			id: budgetId,
			userId: 8,
		});

		await expect(service.remove(7, budgetId)).rejects.toEqual(
			new ForbiddenException('You do not own this budget'),
		);
		expect(prisma.budget.delete).not.toHaveBeenCalled();
	});
});