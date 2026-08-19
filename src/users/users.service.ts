import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

// Select clause that guarantees the password hash is never returned.
const safeUserSelect: Prisma.UserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hash, role: dto.role ?? 'user' },
      select: safeUserSelect,
    });
  }

  findAll() {
    return this.prisma.user.findMany({ select: safeUserSelect });
  }

  // Relational query with include: user -> accounts -> transaction count.
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...safeUserSelect,
        accounts: {
          select: {
            id: true,
            name: true,
            type: true,
            balance: true,
            _count: { select: { transactions: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }
}
