-- ============================================================================
-- FinTrack API — PostgreSQL DDL (db/schema.sql)
-- Canonical schema. Table & column names mirror prisma/schema.prisma 1:1.
-- Money is stored as NUMERIC(12,2) (never FLOAT) to avoid rounding bugs.
-- ============================================================================

-- Drop in dependency order so the script is re-runnable.
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,            -- bcrypt hash, never plaintext
    role       VARCHAR(10)  NOT NULL DEFAULT 'user'
                            CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- accounts  (a wallet/bank/cash account belonging to a user)
-- ----------------------------------------------------------------------------
CREATE TABLE accounts (
    id         SERIAL        PRIMARY KEY,
    user_id    INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(100)  NOT NULL,
    type       VARCHAR(10)   NOT NULL
                             CHECK (type IN ('cash', 'bank', 'e-wallet')),
    balance    NUMERIC(12,2) NOT NULL DEFAULT 0,   -- running balance
    created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts (user_id);

-- ----------------------------------------------------------------------------
-- categories  (income/expense classification, shared across users)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10)  NOT NULL CHECK (type IN ('income', 'expense'))
);

-- ----------------------------------------------------------------------------
-- transactions
-- NOTE: transactions.type (income|expense|transfer) is DISTINCT from
--       categories.type (income|expense). Do not conflate them.
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id               SERIAL        PRIMARY KEY,
    account_id       INTEGER       NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    category_id      INTEGER       NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    type             VARCHAR(10)   NOT NULL
                                   CHECK (type IN ('income', 'expense', 'transfer')),
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description      TEXT,
    transaction_date DATE          NOT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_account_id  ON transactions (account_id);
CREATE INDEX idx_transactions_category_id ON transactions (category_id);
CREATE INDEX idx_transactions_date        ON transactions (transaction_date);

-- ----------------------------------------------------------------------------
-- budgets  (OPTIONAL stretch goal: monthly spending limit per category)
-- ----------------------------------------------------------------------------
CREATE TABLE budgets (
    id           SERIAL        PRIMARY KEY,
    user_id      INTEGER       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id  INTEGER       NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
    month        VARCHAR(7)    NOT NULL,          -- format: 'YYYY-MM'
    limit_amount NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
    UNIQUE (user_id, category_id, month)
);
