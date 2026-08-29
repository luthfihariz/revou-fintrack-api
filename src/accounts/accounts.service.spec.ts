import { PrismaService } from "../prisma/prisma.service";
import { AccountsService } from "./accounts.service";
import {TestingModule, Test} from "@nestjs/testing";


describe('AccountsService', () => {
  let service: AccountsService;
  const prisma = {
    account: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },  
  }

  // Arrange, Act, Assert pattern for unit testing

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it("returns the account for a valid id", async () => {
    // Arrange
    const mockAccount = { id: 1, userId: 99, name: "Test Account", type: "SAVINGS", balance: 1000 };
    prisma.account.findUnique.mockResolvedValue(mockAccount);

    // Act
    const result = await service.findOne(99, 1);

    // Assert
    expect(prisma.account.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(result).toEqual(mockAccount);
  });

})