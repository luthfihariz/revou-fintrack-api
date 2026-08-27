import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class BudgetsService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: number, dto: CreateBudgetDto) {
		const category = await this.prisma.category.findUnique({
			where: { id: dto.categoryId },
		});
		if (!category) {
			throw new NotFoundException(`Category ${dto.categoryId} not found`);
		}

		return this.prisma.budget.create({
			data: {
				month: dto.month,
				year: dto.year,
				limitAmount: dto.limitAmount,
				categoryId: dto.categoryId,
				userId,
			},
		});
	}

	findAll(userId: number) {
		return this.prisma.budget.findMany({
			where: { userId },
			orderBy: [{ year: 'desc' }, { month: 'desc' }],
		});
	}

	async remove(userId: number, id: number) {
		await this.getOwned(userId, id);
		await this.prisma.budget.delete({ where: { id } });

		return { deleted: true, id };
	}

	private async getOwned(userId: number, id: number) {
		const budget = await this.prisma.budget.findUnique({ where: { id } });
		if (!budget) {
			throw new NotFoundException(`Budget ${id} not found`);
		}
		if (budget.userId !== userId) {
			throw new ForbiddenException('You do not own this budget');
		}
		return budget;
	}
}
