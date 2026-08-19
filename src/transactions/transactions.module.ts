import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { BalanceCalculatorService } from './balance-calculator.service';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, BalanceCalculatorService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
