import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountDto {
  name!: string;
  type!: 'cash' | 'bank' | 'e-wallet';
  balance?: number;
}
