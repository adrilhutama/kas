-- KAS REGU 3 — custom dues backfill (idempotent, aman di-run ulang)
-- Run: wrangler d1 execute kas_regu_3 --file=./migrate_custom_dues.sql
--
-- Kolom payments.amount (INTEGER DEFAULT 10000) sudah ada sejak schema.sql
-- awal, sehingga tidak perlu ADD COLUMN. File ini hanya menormalkan baris
-- lama yang amount-nya NULL (jika ada) ke iuran standar Rp 10.000.
-- DB fresh dari schema.sql terbaru tidak perlu langkah ini.

UPDATE payments SET amount = 10000 WHERE amount IS NULL;
