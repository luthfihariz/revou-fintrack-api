import { Decimal } from '@prisma/client/runtime/library';

export class BudgetInsightDto {
  id: number;
  month: number;
  year: number;
  limitAmount: Decimal;
  categoryId: number;
  userId: number;
  category: {
    id: number;
    name: string;
    type: string;
  };
  spent: Decimal;
  remaining: Decimal;
  usagePercentage: number;
}
