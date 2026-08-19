import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['cash', 'bank', 'e-wallet'], {
    message: 'type must be one of: cash, bank, e-wallet',
  })
  type: 'cash' | 'bank' | 'e-wallet';

  // Optional opening balance; running balance is otherwise driven by transactions.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  balance?: number;
}
