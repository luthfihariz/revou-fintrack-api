-- ============================================================================
-- FinTrack API — Analytical queries (db/queries.sql)
-- 8+ queries, each preceded by a one-line comment explaining its purpose.
-- ============================================================================

-- 1. Filtered SELECT: all expense transactions for account #2, newest first.
SELECT id, amount, description, transaction_date
FROM transactions
WHERE account_id = 2
  AND type = 'expense'
ORDER BY transaction_date DESC;

-- 2. 3-table JOIN: transaction -> account -> category -> user detail rows.
SELECT u.name        AS user_name,
       a.name        AS account_name,
       c.name        AS category_name,
       t.type        AS transaction_type,
       t.amount,
       t.transaction_date
FROM transactions t
JOIN accounts   a ON a.id = t.account_id
JOIN categories c ON c.id = t.category_id
JOIN users      u ON u.id = a.user_id
ORDER BY t.transaction_date DESC;

-- 3. GROUP BY aggregation: total expense per category per month.
SELECT c.name                                   AS category_name,
       TO_CHAR(t.transaction_date, 'YYYY-MM')   AS month,
       SUM(t.amount)                            AS total_expense
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.type = 'expense'
GROUP BY c.name, TO_CHAR(t.transaction_date, 'YYYY-MM')
ORDER BY month, total_expense DESC;

-- 4. Advanced (CTE + window function): each account's balance vs. the average
--    balance of the same user, flagging below-average accounts.
WITH user_avg AS (
    SELECT id,
           user_id,
           name,
           balance,
           AVG(balance) OVER (PARTITION BY user_id) AS user_avg_balance
    FROM accounts
)
SELECT user_id,
       name        AS account_name,
       balance,
       ROUND(user_avg_balance, 2) AS user_avg_balance,
       CASE WHEN balance < user_avg_balance THEN 'below average' ELSE 'at/above average' END AS standing
FROM user_avg
ORDER BY user_id, balance DESC;

-- 5. LEFT JOIN surfacing categories with ZERO transactions.
SELECT c.id,
       c.name,
       c.type,
       COUNT(t.id) AS transaction_count
FROM categories c
LEFT JOIN transactions t ON t.category_id = c.id
GROUP BY c.id, c.name, c.type
HAVING COUNT(t.id) = 0
ORDER BY c.name;

-- 6. Total income vs. expense per user.
SELECT u.name AS user_name,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0)  AS total_income,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS total_expense,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0)
         - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS net
FROM users u
JOIN accounts a     ON a.user_id = u.id
JOIN transactions t ON t.account_id = a.id
GROUP BY u.name
ORDER BY net DESC;

-- 7. Largest single transaction per month (subquery / ranking).
SELECT month, amount, description, transaction_date
FROM (
    SELECT TO_CHAR(transaction_date, 'YYYY-MM') AS month,
           amount,
           description,
           transaction_date,
           RANK() OVER (
               PARTITION BY TO_CHAR(transaction_date, 'YYYY-MM')
               ORDER BY amount DESC
           ) AS rnk
    FROM transactions
) ranked
WHERE rnk = 1
ORDER BY month;

-- 8. Top spending category per user (window function over grouped totals).
WITH spend AS (
    SELECT u.id   AS user_id,
           u.name AS user_name,
           c.name AS category_name,
           SUM(t.amount) AS total_spent,
           ROW_NUMBER() OVER (
               PARTITION BY u.id
               ORDER BY SUM(t.amount) DESC
           ) AS rn
    FROM users u
    JOIN accounts a     ON a.user_id = u.id
    JOIN transactions t ON t.account_id = a.id
    JOIN categories c   ON c.id = t.category_id
    WHERE t.type = 'expense'
    GROUP BY u.id, u.name, c.name
)
SELECT user_name, category_name, total_spent
FROM spend
WHERE rn = 1
ORDER BY total_spent DESC;

-- 9. Budget vs. actual: flag categories where Feb 2026 spending exceeds the limit.
SELECT u.name          AS user_name,
       c.name          AS category_name,
       b.month,
       b.limit_amount,
       COALESCE(SUM(t.amount), 0) AS actual_spent,
       CASE WHEN COALESCE(SUM(t.amount), 0) > b.limit_amount
            THEN 'OVER BUDGET' ELSE 'within budget' END AS status
FROM budgets b
JOIN users u      ON u.id = b.user_id
JOIN categories c ON c.id = b.category_id
LEFT JOIN accounts a     ON a.user_id = b.user_id
LEFT JOIN transactions t ON t.account_id = a.id
                        AND t.category_id = b.category_id
                        AND t.type = 'expense'
                        AND TO_CHAR(t.transaction_date, 'YYYY-MM') = b.month
GROUP BY u.name, c.name, b.month, b.limit_amount
ORDER BY u.name;
