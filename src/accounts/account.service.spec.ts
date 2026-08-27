import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { PrismaService } from "../prisma/prisma.service";

describe('AccountsService', () => {
  let service: AccountsService;
  const prisma = {
    account: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns an Account for a valid id', async () => {
    const account = { id: 1, userId: 7, name: 'Checking', type: 'checking', balance: 1000 };
    prisma.account.findUnique.mockResolvedValue(account);

    await expect(service.findOne(7, 1)).resolves.toBe(account);
    expect(prisma.account.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('creates an account and maps e-wallet to the Prisma enum value', async () => {
    const account = { id: 1, userId: 7, name: 'Wallet', type: 'e_wallet', balance: 250 };
    prisma.account.create.mockResolvedValue(account);

    await expect(
      service.create(7, { name: 'Wallet', type: 'e-wallet', balance: 250 }),
    ).resolves.toBe(account);

    expect(prisma.account.create).toHaveBeenCalledWith({
      data: { userId: 7, name: 'Wallet', type: 'e_wallet', balance: 250 },
    });
  });

  it('uses zero when creating an account without a balance', async () => {
    prisma.account.create.mockResolvedValue({});

    await service.create(7, { name: 'Cash', type: 'cash' });

    expect(prisma.account.create).toHaveBeenCalledWith({
      data: { userId: 7, name: 'Cash', type: 'cash', balance: 0 },
    });
  });

  it('lists only the user accounts in ascending id order', async () => {
    const accounts = [{ id: 1, userId: 7 }];
    prisma.account.findMany.mockResolvedValue(accounts);

    await expect(service.findAll(7)).resolves.toBe(accounts);
    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      orderBy: { id: 'asc' },
    });
  });

  it('throws NotFoundException when an account does not exist', async () => {
    prisma.account.findUnique.mockResolvedValue(null);

    await expect(service.findOne(7, 99)).rejects.toThrow(
      new NotFoundException('Account 99 not found'),
    );
  });

  it('throws ForbiddenException when an account belongs to another user', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 1, userId: 8 });

    await expect(service.findOne(7, 1)).rejects.toThrow(
      new ForbiddenException('You do not own this account'),
    );
  });

  it('finds an owned account transactions with category details', async () => {
    const transactions = [{ id: 2, accountId: 1, category: { id: 3 } }];
    prisma.account.findUnique.mockResolvedValue({ id: 1, userId: 7 });
    prisma.transaction.findMany.mockResolvedValue(transactions);

    await expect(service.findTransactions(7, 1)).resolves.toBe(transactions);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { accountId: 1 },
      include: { category: true },
      orderBy: { transactionDate: 'desc' },
    });
  });

  it('updates an owned account and maps its type', async () => {
    const updated = { id: 1, userId: 7, type: 'e_wallet' };
    prisma.account.findUnique.mockResolvedValue({ id: 1, userId: 7 });
    prisma.account.update.mockResolvedValue(updated);

    await expect(
      service.update(7, 1, { name: 'Main wallet', type: 'e-wallet', balance: 300 }),
    ).resolves.toBe(updated);
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Main wallet', type: 'e_wallet', balance: 300 },
    });
  });

  it('updates the balance of an owned account', async () => {
    const updated = { id: 1, balance: 400 };
    prisma.account.findUnique.mockResolvedValue({ id: 1, userId: 7 });
    prisma.account.update.mockResolvedValue(updated);

    await expect(service.updateBalance(7, 1, { balance: 400 })).resolves.toBe(updated);
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: 400 },
    });
  });

  it('removes an owned account', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 1, userId: 7 });

    await expect(service.remove(7, 1)).resolves.toEqual({ deleted: true, id: 1 });
    expect(prisma.account.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('finds accounts below the requested balance threshold', async () => {
    const accounts = [{ id: 1, balance: 50 }];
    prisma.account.findMany.mockResolvedValue(accounts);

    await expect(service.findLowBalance(100)).resolves.toBe(accounts);
    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: { balance: { lt: 100 } },
    });
  });
});