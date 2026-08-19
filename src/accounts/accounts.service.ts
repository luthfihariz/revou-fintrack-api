import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: number, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: this.mapType(dto.type),
        balance: dto.balance ?? 0,
      },
    });
  }

  // Only the owner's accounts are ever listed.
  findAll(userId: number) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(userId: number, id: number) {
    const account = await this.getOwned(userId, id);
    return account;
  }

  // Relational query with include: account + its transactions (category nested).
  async findTransactions(userId: number, id: number) {
    await this.getOwned(userId, id);
    return this.prisma.transaction.findMany({
      where: { accountId: id },
      include: { category: true },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async update(userId: number, id: number, dto: UpdateAccountDto) {
    await this.getOwned(userId, id);
    return this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type ? this.mapType(dto.type) : undefined,
        balance: dto.balance,
      },
    });
  }

  async remove(userId: number, id: number) {
    await this.getOwned(userId, id);
    await this.prisma.account.delete({ where: { id } });
    return { deleted: true, id };
  }

  // Ownership enforcement: 404 if missing, 403 if it belongs to another user.
  private async getOwned(userId: number, id: number) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not own this account');
    }
    return account;
  }

  private mapType(type: 'cash' | 'bank' | 'e-wallet') {
    // Prisma enum uses e_wallet mapped to the DB value 'e-wallet'.
    return type === 'e-wallet' ? 'e_wallet' : type;
  }
}
