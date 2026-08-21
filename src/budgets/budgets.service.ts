import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget-dto';

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
