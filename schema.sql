-- KAS REGU 3 — D1 schema + seed data
-- Apply: wrangler d1 execute kas_regu_3 --file=./schema.sql

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id),
  month_period TEXT NOT NULL,
  amount INTEGER DEFAULT 10000,
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, month_period)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  expense_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(month_period);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Seed members (IDs 1-13 in this order)
INSERT INTO members (name, is_active) VALUES
  ('HEDY', 1),
  ('ADRIL', 1),
  ('ILHAM', 1),
  ('SANDI', 1),
  ('SANIA', 1),
  ('HERMAN', 1),
  ('RAKA', 1),
  ('BAYU', 1),
  ('SUGENG', 1),
  ('SUTISNA', 1),
  ('RIDWAN SOLO', 1),
  ('INDRA', 1),
  ('RIDWAN PKD', 1);

-- Seed payments: July 2026 — all 13 paid
INSERT INTO payments (member_id, month_period, amount) VALUES
  (1,'2026-07',10000),(2,'2026-07',10000),(3,'2026-07',10000),
  (4,'2026-07',10000),(5,'2026-07',10000),(6,'2026-07',10000),
  (7,'2026-07',10000),(8,'2026-07',10000),(9,'2026-07',10000),
  (10,'2026-07',10000),(11,'2026-07',10000),(12,'2026-07',10000),
  (13,'2026-07',10000);

-- Seed payments: August 2026 — all 13 paid
INSERT INTO payments (member_id, month_period, amount) VALUES
  (1,'2026-08',10000),(2,'2026-08',10000),(3,'2026-08',10000),
  (4,'2026-08',10000),(5,'2026-08',10000),(6,'2026-08',10000),
  (7,'2026-08',10000),(8,'2026-08',10000),(9,'2026-08',10000),
  (10,'2026-08',10000),(11,'2026-08',10000),(12,'2026-08',10000),
  (13,'2026-08',10000);

-- Seed payments: September 2026 — 10 paid (RAKA, BAYU, INDRA unpaid)
INSERT INTO payments (member_id, month_period, amount) VALUES
  (1,'2026-09',10000),(2,'2026-09',10000),(3,'2026-09',10000),
  (4,'2026-09',10000),(5,'2026-09',10000),(6,'2026-09',10000),
  (9,'2026-09',10000),(10,'2026-09',10000),(11,'2026-09',10000),
  (13,'2026-09',10000);

-- Seed expenses
INSERT INTO expenses (description, amount, expense_date) VALUES
  ('Beli kado untuk anaknya Reza', 70000, '2026-08-10'),
  ('Kasih ke Bayu', 50000, '2026-08-25');
