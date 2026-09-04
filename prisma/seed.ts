// Prisma seed — replicates db/seed.sql through the Prisma client.
// Run with: npx prisma db seed
import { PrismaClient, Role, AccountType, CategoryType, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clean slate (respect FK order).
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 10);

  // Users
  const alice = await prisma.user.create({
    data: { name: 'Alice Rahman', email: 'alice@fintrack.dev', password, role: Role.admin },
  });
  const budi = await prisma.user.create({
    data: { name: 'Budi Santoso', email: 'budi@fintrack.dev', password, role: Role.user },
  });
  const citra = await prisma.user.create({
    data: { name: 'Citra Dewi', email: 'citra@fintrack.dev', password, role: Role.user },
  });

  // Accounts (2 per user)
  const [aliceCash, aliceBca] = await Promise.all([
    prisma.account.create({ data: { userId: alice.id, name: 'Alice Cash', type: AccountType.cash, balance: 500000 } }),
    prisma.account.create({ data: { userId: alice.id, name: 'Alice BCA', type: AccountType.bank, balance: 7500000 } }),
  ]);
  const [budiWallet, budiMandiri] = await Promise.all([
    prisma.account.create({ data: { userId: budi.id, name: 'Budi Wallet', type: AccountType.e_wallet, balance: 250000 } }),
    prisma.account.create({ data: { userId: budi.id, name: 'Budi Mandiri', type: AccountType.bank, balance: 3200000 } }),
  ]);
  const [citraGopay, citraCash] = await Promise.all([
    prisma.account.create({ data: { userId: citra.id, name: 'Citra GoPay', type: AccountType.e_wallet, balance: 150000 } }),
    prisma.account.create({ data: { userId: citra.id, name: 'Citra Cash', type: AccountType.cash, balance: 800000 } }),
  ]);

  // Categories
  const cats = await Promise.all(
    [
      { name: 'Salary', type: CategoryType.income },
      { name: 'Freelance', type: CategoryType.income },
      { name: 'Groceries', type: CategoryType.expense },
      { name: 'Transport', type: CategoryType.expense },
      { name: 'Dining Out', type: CategoryType.expense },
      { name: 'Utilities', type: CategoryType.expense },
      { name: 'Entertainment', type: CategoryType.expense }, // intentionally zero transactions
    ].map((data) => prisma.category.create({ data })),
  );
  const [salary, freelance, groceries, transport, dining, utilities] = cats;

  // Transactions (22 total)
  const tx = (
    accountId: number,
    categoryId: number,
    type: TransactionType,
    amount: number,
    description: string,
    date: string,
  ) => ({ accountId, categoryId, type, amount, description, transactionDate: new Date(date) });

  await prisma.transaction.createMany({
    data: [
      // Alice
      tx(aliceBca.id, salary.id, TransactionType.income, 8000000, 'Monthly salary', '2026-01-25'),
      tx(aliceBca.id, groceries.id, TransactionType.expense, 450000, 'Weekly groceries', '2026-01-27'),
      tx(aliceCash.id, transport.id, TransactionType.expense, 50000, 'Grab to office', '2026-01-28'),
      tx(aliceBca.id, utilities.id, TransactionType.expense, 350000, 'Electricity bill', '2026-02-01'),
      tx(aliceCash.id, dining.id, TransactionType.expense, 120000, 'Dinner with team', '2026-02-03'),
      tx(aliceBca.id, freelance.id, TransactionType.income, 1500000, 'Logo design gig', '2026-02-10'),
      tx(aliceBca.id, groceries.id, TransactionType.expense, 400000, 'Groceries restock', '2026-02-15'),
      // Budi
      tx(budiMandiri.id, salary.id, TransactionType.income, 6000000, 'Monthly salary', '2026-01-25'),
      tx(budiWallet.id, transport.id, TransactionType.expense, 35000, 'Bus fare', '2026-01-26'),
      tx(budiWallet.id, dining.id, TransactionType.expense, 85000, 'Lunch', '2026-01-29'),
      tx(budiMandiri.id, utilities.id, TransactionType.expense, 275000, 'Internet bill', '2026-02-01'),
      tx(budiMandiri.id, groceries.id, TransactionType.expense, 300000, 'Supermarket', '2026-02-05'),
      tx(budiWallet.id, freelance.id, TransactionType.income, 900000, 'Photography side job', '2026-02-12'),
      tx(budiMandiri.id, transport.id, TransactionType.expense, 60000, 'Toll & parking', '2026-02-18'),
      // Citra
      tx(citraCash.id, salary.id, TransactionType.income, 5500000, 'Monthly salary', '2026-01-25'),
      tx(citraGopay.id, dining.id, TransactionType.expense, 45000, 'Coffee & snack', '2026-01-30'),
      tx(citraCash.id, groceries.id, TransactionType.expense, 220000, 'Market shopping', '2026-02-02'),
      tx(citraGopay.id, transport.id, TransactionType.expense, 25000, 'Ojek online', '2026-02-04'),
      tx(citraCash.id, utilities.id, TransactionType.expense, 180000, 'Water bill', '2026-02-06'),
      tx(citraGopay.id, freelance.id, TransactionType.income, 1200000, 'Content writing', '2026-02-14'),
      tx(citraCash.id, dining.id, TransactionType.expense, 95000, 'Family dinner', '2026-02-20'),
      tx(citraCash.id, groceries.id, TransactionType.expense, 260000, 'Monthly groceries', '2026-02-22'),
    ],
  });

  console.log('Seed complete: 3 users, 6 accounts, 7 categories, 22 transactions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
