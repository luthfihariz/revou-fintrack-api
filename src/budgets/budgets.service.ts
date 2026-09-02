import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget-dto';
import { BudgetInsightDto } from './dto/budget-insight.dto';

@Injectable()
export class BudgetsService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: number, dto: CreateBudgetDto) {
		if (dto.month < 1 || dto.month > 12) {
			throw new BadRequestException('Month must be between 1 and 12');
		}

		const category = await this.prisma.category.findUnique({
			where: { id: dto.categoryId },
		});
        
		if (!category) {
			throw new NotFoundException(`Category ${dto.categoryId} not found`);
		}

		const budget = await this.prisma.budget.create({
			data: {
				userId,
				categoryId: dto.categoryId,
				month: dto.month,
				year: dto.year,
				limitAmount: dto.limitAmount,
			},
			include: { category: true },
		});
		return budget;
	}

	findAllBudget(userId: number) {
		return this.prisma.budget.findMany({
			where: { userId },
			include: { category: true },
		});
	}

	async findBudgetInsights(userId: number) {
		const now = new Date();
		const currentMonth = now.getMonth() + 1;
		const currentYear = now.getFullYear();

		// Get all budgets for the current month/year
		const budgets = await this.prisma.budget.findMany({
			where: {
				userId,
				month: currentMonth,
				year: currentYear,
			},
			include: { category: true },
		});

		// For each budget, calculate spent amount and usage metrics
		const insights: BudgetInsightDto[] = [];

		for (const budget of budgets) {
			// Sum all income and expense transactions for this budget's category
			// that fall within the current month/year
			const transactionSum = await this.prisma.transaction.aggregate({
				where: {
					categoryId: budget.categoryId,
					type: { in: ['income', 'expense'] },
					transactionDate: {
						gte: new Date(currentYear, currentMonth - 1, 1),
						lte: new Date(currentYear, currentMonth, 0),
					},
					// Ensure transaction belongs to user's account
					account: {
						userId,
					},
				},
				_sum: { amount: true },
			});

			const spent = new Prisma.Decimal(transactionSum._sum.amount ?? 0);
			const remaining = budget.limitAmount.minus(spent);
			const usagePercentage = budget.limitAmount.toNumber() > 0
				? (spent.toNumber() / budget.limitAmount.toNumber()) * 100
				: 0;

			insights.push({
				...budget,
				spent,
				remaining,
				usagePercentage,
			});
		}

		return insights;
	}

	async remove(userId: number, id: number) {
		const existing = await this.getOwned(userId, id);

		await this.prisma.budget.delete({ where: { id: existing.id } });

		return { deleted: true, id };
	}

	private async getOwned(userId: number, id: number) {
		const budget = await this.prisma.budget.findUnique({
			where: { id },
			include: { category: true },
		});
		if (!budget) {
			throw new NotFoundException(`Budget ${id} not found`);
		}
		if (budget.userId !== userId) {
			throw new ForbiddenException('You do not own this budget');
		}
		return budget;
	}
}
