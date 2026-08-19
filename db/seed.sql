-- ============================================================================
-- FinTrack API — Sample data (db/seed.sql)
-- 3 users, 2 accounts/user, 6 categories, 20+ transactions.
-- Passwords below are bcrypt hashes of "password123".
-- Run AFTER schema.sql. Truncates first so it is re-runnable.
-- ============================================================================

TRUNCATE TABLE budgets, transactions, categories, accounts, users RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- users  (bcrypt hash shown is for the plaintext "password123")
-- ----------------------------------------------------------------------------
INSERT INTO users (name, email, password, role) VALUES
    ('Alice Rahman', 'alice@fintrack.dev', '$2b$10$K7L1OJ0/9Z0Zp0m9Q3q3ne0m1oQ8mF1z1r6yqJd5g6b7c8d9e0f1', 'admin'),
    ('Budi Santoso', 'budi@fintrack.dev',  '$2b$10$K7L1OJ0/9Z0Zp0m9Q3q3ne0m1oQ8mF1z1r6yqJd5g6b7c8d9e0f1', 'user'),
    ('Citra Dewi',   'citra@fintrack.dev', '$2b$10$K7L1OJ0/9Z0Zp0m9Q3q3ne0m1oQ8mF1z1r6yqJd5g6b7c8d9e0f1', 'user');

-- ----------------------------------------------------------------------------
-- accounts  (2 per user)
-- ----------------------------------------------------------------------------
INSERT INTO accounts (user_id, name, type, balance) VALUES
    (1, 'Alice Cash',        'cash',     500000.00),
    (1, 'Alice BCA',         'bank',     7500000.00),
    (2, 'Budi Wallet',       'e-wallet', 250000.00),
    (2, 'Budi Mandiri',      'bank',     3200000.00),
    (3, 'Citra GoPay',       'e-wallet', 150000.00),
    (3, 'Citra Cash',        'cash',     800000.00);

-- ----------------------------------------------------------------------------
-- categories  (mix of income & expense)
-- ----------------------------------------------------------------------------
INSERT INTO categories (name, type) VALUES
    ('Salary',        'income'),
    ('Freelance',     'income'),
    ('Groceries',     'expense'),
    ('Transport',     'expense'),
    ('Dining Out',    'expense'),
    ('Utilities',     'expense'),
    ('Entertainment', 'expense');   -- kept intentionally with zero transactions

-- ----------------------------------------------------------------------------
-- transactions  (20+, spread across accounts/categories/dates)
-- ----------------------------------------------------------------------------
INSERT INTO transactions (account_id, category_id, type, amount, description, transaction_date) VALUES
    -- Alice
    (2, 1, 'income',  8000000.00, 'Monthly salary',          '2026-01-25'),
    (2, 3, 'expense', 450000.00,  'Weekly groceries',        '2026-01-27'),
    (1, 4, 'expense', 50000.00,   'Grab to office',          '2026-01-28'),
    (2, 6, 'expense', 350000.00,  'Electricity bill',        '2026-02-01'),
    (1, 5, 'expense', 120000.00,  'Dinner with team',        '2026-02-03'),
    (2, 2, 'income',  1500000.00, 'Logo design gig',         '2026-02-10'),
    (2, 3, 'expense', 400000.00,  'Groceries restock',       '2026-02-15'),
    -- Budi
    (4, 1, 'income',  6000000.00, 'Monthly salary',          '2026-01-25'),
    (3, 4, 'expense', 35000.00,   'Bus fare',                '2026-01-26'),
    (3, 5, 'expense', 85000.00,   'Lunch',                   '2026-01-29'),
    (4, 6, 'expense', 275000.00,  'Internet bill',           '2026-02-01'),
    (4, 3, 'expense', 300000.00,  'Supermarket',             '2026-02-05'),
    (3, 2, 'income',  900000.00,  'Photography side job',    '2026-02-12'),
    (4, 4, 'expense', 60000.00,   'Toll & parking',          '2026-02-18'),
    -- Citra
    (6, 1, 'income',  5500000.00, 'Monthly salary',          '2026-01-25'),
    (5, 5, 'expense', 45000.00,   'Coffee & snack',          '2026-01-30'),
    (6, 3, 'expense', 220000.00,  'Market shopping',         '2026-02-02'),
    (5, 4, 'expense', 25000.00,   'Ojek online',             '2026-02-04'),
    (6, 6, 'expense', 180000.00,  'Water bill',              '2026-02-06'),
    (5, 2, 'income',  1200000.00, 'Content writing',         '2026-02-14'),
    (6, 5, 'expense', 95000.00,   'Family dinner',           '2026-02-20'),
    (6, 3, 'expense', 260000.00,  'Monthly groceries',       '2026-02-22');

-- ----------------------------------------------------------------------------
-- budgets  (optional stretch goal sample)
-- ----------------------------------------------------------------------------
INSERT INTO budgets (user_id, category_id, month, limit_amount) VALUES
    (1, 3, '2026-02', 1000000.00),
    (2, 5, '2026-02', 500000.00),
    (3, 3, '2026-02', 600000.00);
