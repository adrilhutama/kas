# KAS REGU 3 — Deployment Guide

## 0. Prasyarat
- Akun GitHub + akun Cloudflare (Workers & Pages + D1 aktif).
- `git`, `node ≥ 18`, `wrangler` (`npm i -g wrangler`), dan `gh` CLI (opsional).

## 1. Struktur repo
```
kas-regu-3/
├── schema.sql
├── wrangler.toml
├── functions/api/[[path]].js
├── public/index.html
└── public/admin.html
```

## 2. Push ke GitHub
```bash
cd kas-regu-3
git init -b main
git add .
git commit -m "feat: KAS REGU 3 initial release"
gh repo create kas-regu-3 --public --source=. --push
# atau manual: git remote add origin <URL> && git push -u origin main
```

## 3. Buat D1 + seed data
```bash
wrangler login
wrangler d1 create kas_regu_3
# → salin `database_id` ke wrangler.toml, lalu:
wrangler d1 execute kas_regu_3 --file=./schema.sql
# verifikasi:
wrangler d1 execute kas_regu_3 --command="SELECT COUNT(*) AS members FROM members; SELECT COUNT(*) AS payments FROM payments; SELECT COALESCE(SUM(amount),0) AS expense FROM expenses;"
# ekspektasi: members=13, payments=36, expense=120000
```

## 4. Deploy via Cloudflare Pages (GitHub integration)
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pilih repo `kas-regu-3`.
2. Build settings:
   - Framework preset: **None**
   - Build command: *(kosongkan)*
   - Output directory: `public`
3. **Bindings** → tambah D1 binding: variable `DB` → database `kas_regu_3`.
4. **Environment Variables** → tambah secret `ADMIN_KEY` (password admin, mis. string acak 24+ karakter). Via CLI alternatif:
   ```bash
   wrangler pages secret put ADMIN_KEY --project-name=kas-regu-3
   ```
5. **Save and Deploy**.

> Setiap `git push` ke `main` otomatis redeploy. Functions di `functions/` ikut ter-deploy tanpa build step.

## 5. Uji cepat
```bash
curl -s "https://<project>.pages.dev/api/summary?months=2026-07,2026-08,2026-09" | head -c 500
# ekspektasi: total_income=360000, total_expense=120000, current_balance=240000
```
- Buka `/` → matriks iuran tampil, badge ✓/– benar.
- Buka `/admin.html` → login dengan `ADMIN_KEY` → toggle 1 pembayaran → badge berubah tanpa reload → refresh → tetap tersimpan.
- Tambah expense → muncul di publik. Hapus expense → ada dialog konfirmasi.

## 6. Operasional
- **Ganti password admin:** ubah secret `ADMIN_KEY` di dashboard (Pages → Settings → Environment Variables) → redeploy.
- **Bulan baru:** admin tambah via input bulan di dashboard, atau query publik `?months=2026-10`.
- **Backup D1:** `wrangler d1 export kas_regu_3 --output=backup.sql`
- **Anggota pindah/nonaktif:** ketuk nama di dashboard (tetap tersimpan di histori).
