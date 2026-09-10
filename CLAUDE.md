# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

KAS REGU 3 — a cash/dues tracker for a 13-person team. Static dark-mode pages on **Cloudflare Pages** + a single **Pages Functions** API router + **Cloudflare D1** (SQLite). No npm, no build step, no framework, no tests. Output dir is `public/`; every `git push` to `main` redeploys automatically.

## Files (the whole app)

- `public/index.html` — public read-only view (matrix, expenses, WA share, payment accordion)
- `public/admin.html` — admin dashboard behind a login barrier (toggle payments, CRUD expenses/members)
- `functions/api/[[path]].js` — the entire backend: one catch-all router for all `/api/*` routes
- `schema.sql` — DDL + seed data (13 members, dues Rp 10.000/mo from 2026-07)
- `wrangler.toml` — Pages + D1 binding (`DB`); `database_id` already filled in
- `DEPLOY.md` — full deploy/runbook (bind D1 as `DB`, set `ADMIN_KEY` secret, smoke tests)

## Commands

```bash
# syntax-check backend (bracket filename — quote it)
node --check 'functions/api/[[path]].js'

# syntax-check an inline page script: extract <script>…</script> to a temp file, then node --check it
# (no python/node-inline tooling assumed; use whatever extractor is available)

# D1 ops
wrangler d1 execute kas_regu_3 --file=./schema.sql
wrangler d1 execute kas_regu_3 --command="SELECT COUNT(*) FROM payments;"
wrangler d1 export kas_regu_3 --output=backup.sql

# rotate admin password (never commit it — lives only as a Pages secret)
wrangler pages secret put ADMIN_KEY --project-name=kas-regu-3

# smoke test prod
curl -s "https://<project>.pages.dev/api/summary?months=2026-07,2026-08,2026-09"
```

There is no build, lint, or test suite. Verification = `node --check` + `curl` + open `/` and `/admin.html`.

## Architecture

**Request flow:** browser `fetch('/api/summary?months=…')` → `functions/api/[[path]].js:onRequest` strips the `/api/` prefix and dispatches on method+path → D1 via prepared statements (`env.DB.prepare(...).bind(...)`) → JSON.

**`GET /api/summary` payload** (the only read endpoint; both pages render entirely from it): `total_income`, `total_expense`, `current_balance`, `month_fee`, `months` (filtered), `available_months`, `per_month[]`, `members[]` (each: `paid{YYYY-MM:bool}`, `paid_count`, `unpaid_count`, `total_paid` = sum of actual `payments.amount`), `expenses[]`, `goal` (nullable: `title`, `target_amount`, `sibagi_url`, `external_funds`, `total_collected` = balance + external, `percentage` capped at 100, `remaining` floored at 0).

**Auth model:** `POST /api/auth/login {password}` returns `{token}` where token == `env.ADMIN_KEY` verbatim. Admin routes check `Authorization: Bearer <ADMIN_KEY>` via `isAdmin()`. Token persists in `sessionStorage`. No JWT, no hashing — by design for a single-password team tool.

**Frontend pattern (both pages):** module-level `ACTIVE[]` (selected months) → `load()` fetches summary → `render(payload)` rebuilds chips/table/lists. Admin adds `TOKEN`, `DATA`, and optimistic UI on toggle (flips badge + adjusts Total instantly, then `load()` re-syncs). Shared helpers are copy-pasted per page (`rp`, `namaBulan`, `tglID`, `copyText`, `buildWAText`, `unpaidList`) — keep them in sync when changing one.

## Gotchas

- **Two notions of "current month":** `THIS_MONTH` is wall-clock local time (drives the "Bulan Ini" highlight, unpaid filter, WA text). The month *chips* are an independent display filter. Don't conflate them.
- **`total_paid` sums real amounts** from D1; clients fall back to `paid_count × month_fee` for stale cached payloads.
- **Sticky name column** needs solid `background-color` on `td:first-child` per zebra row, or scrolled cells bleed through.
- **`PAY_INFO` config** at the top of `index.html`'s script holds placeholder bank/account values — the one thing that must be edited in HTML for real use (`qrisImg: ''` hides the QRIS slot until set).
- Clipboard uses `navigator.clipboard` with a `textarea`+`execCommand` fallback for non-HTTPS/old browsers.
- Totals are all-time (`SUM` over full tables), while the matrix only shows selected months — this is intentional.
