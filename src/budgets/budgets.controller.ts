import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget-dto';

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
	constructor(private readonly budgetsService: BudgetsService) {}

	@Post()
	create(@CurrentUser('id') userId: number, @Body() dto: CreateBudgetDto) {
		return this.budgetsService.create(userId, dto);
	}

	@Get()
	findAll(@CurrentUser('id') userId: number) {
		return this.budgetsService.findAllBudget(userId);
	}

	@Delete(':id')
	remove(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
		return this.budgetsService.remove(userId, id);
	}
}
