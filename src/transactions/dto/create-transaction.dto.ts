import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateTransactionDto {
  @IsInt()
  accountId: number;

  @IsInt()
  categoryId: number;

  @IsIn(['income', 'expense', 'transfer'], {
    message: 'type must be one of: income, expense, transfer',
  })
  type: 'income' | 'expense' | 'transfer';

  // Money must be a positive number with at most 2 decimals.
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'amount must be a positive number' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  // Must be a valid ISO date string (e.g. 2026-02-15).
  @IsISO8601({ strict: true }, { message: 'transactionDate must be a valid ISO date' })
  transactionDate: string;
}
