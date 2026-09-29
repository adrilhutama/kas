-- KAS REGU 3 — migrate live D1: tambahkan kolom receipt_key ke tabel expenses
-- Simpan nama file bukti/nota pada bucket R2 (kas-receipts).
-- Run: wrangler d1 execute kas_regu_3 --file=./migrate_expenses_receipt.sql
-- Idempotent: kolom nullable, aman dijalankan ulang.
-- (DB fresh dari schema.sql sudah punya kolom ini sehingga bisa dilewati.)

ALTER TABLE expenses ADD COLUMN receipt_key TEXT DEFAULT NULL;
