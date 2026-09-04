import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
} from "class-validator";

export class TransactionFilterDto {
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsIn(["income", "expense", "transfer"])
  type?: "income" | "expense" | "transfer";

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  minAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  maxAmount?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  fromDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  toDate?: string;
}
