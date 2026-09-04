import { IsIn, IsNumber, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name!: string;

  @IsIn(['cash', 'bank', 'e-wallet'])
  type!: 'cash' | 'bank' | 'e-wallet';

  @IsNumber()
  balance?: number;
}
