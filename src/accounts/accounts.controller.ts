import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

// All account routes require authentication and enforce ownership in the service.
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@CurrentUser('id') userId: number, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: number) {
    return this.accountsService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.accountsService.findOne(userId, id);
  }

  @Get(':id/transactions')
  findTransactions(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.accountsService.findTransactions(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.accountsService.remove(userId, id);
  }
}
