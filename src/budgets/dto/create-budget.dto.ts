import { IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(1000)
  @Max(9999)
  year!: number;

  @IsNumber()
  @IsPositive()
  limitAmount!: number;

  @IsInt()
  categoryId!: number;
}
