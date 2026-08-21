import { IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsInt()
  categoryId!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  year!: number;

  @IsNumber()
  @IsPositive()
  limitAmount!: number;
}
