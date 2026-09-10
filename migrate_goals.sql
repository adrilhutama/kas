-- KAS REGU 3 — migrate live D1: add goals table (idempotent, aman di-run ulang)
-- Run: wrangler d1 execute kas_regu_3 --file=./migrate_goals.sql
-- (Tidak perlu jika DB dibuat fresh via schema.sql yang sudah memuat tabel goals.)

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  sibagi_url TEXT DEFAULT '',
  external_funds INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed hanya jika tabel masih kosong (WHERE NOT EXISTS = tidak duplikat saat re-run)
INSERT INTO goals (title, target_amount, sibagi_url, external_funds, is_active)
SELECT 'Target Kas & Acara Akhir Tahun', 1000000, 'https://sibagi.com/username_anda', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM goals);
