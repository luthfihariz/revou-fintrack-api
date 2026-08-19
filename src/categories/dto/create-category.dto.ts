import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['income', 'expense'], { message: 'type must be one of: income, expense' })
  type: 'income' | 'expense';
}
