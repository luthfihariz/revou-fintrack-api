import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hash },
    });

    return this.sign(user.id, user.email, user.role, this.sanitize(user));
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.sign(user.id, user.email, user.role, this.sanitize(user));
  }

  private sign(id: number, email: string, role: string, user: Record<string, unknown>) {
    const access_token = this.jwt.sign({ sub: id, email, role });
    return { access_token, user };
  }

  // Never leak the password hash in any response.
  private sanitize<T extends { password?: string }>(user: T) {
    const sanitized = { ...user };
    delete sanitized.password;
    return sanitized;
  }
}