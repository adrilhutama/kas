-- KAS REGU 3 — member start_month column (idempotent)
-- Run: wrangler d1 execute kas_regu_3 --file=./migrate_member_start_month.sql
--
-- Menambahkan kolom start_month (TEXT, nullable) ke tabel members untuk menandai
-- bulan pertama seorang anggota wajib membayar iuran. Berguna untuk anggota baru
-- atau mutasi masuk yang terdaftar setelah periode kas berjalan.
-- Baris lama di-backfill ke '2026-07' agar tidak ada NULL.

ALTER TABLE members ADD COLUMN start_month TEXT;
UPDATE members SET start_month = '2026-07' WHERE start_month IS NULL;
