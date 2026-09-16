# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

KAS REGU 3 — a cash/dues tracker for a 13-person team. Static dark-mode pages on **Cloudflare Pages** + a single **Pages Functions** API router + **Cloudflare D1** (SQLite). No npm, no build step, no framework, no tests. Output dir is `public/`; every `git push` to `main` redeploys automatically.

## Files (the whole app)

- `public/index.html` — public read-only view (stats, payment accordion + QRIS, savings goal, matrix, expenses)
- `public/admin.html` — admin dashboard behind a login barrier (WA recap share, toggle payments + custom nominal modal, CRUD expenses/members/goal)
- `public/spin.html` — "Roda Backup Libur" wheel: canvas + Web Audio tick/clack/fanfare, segment-engine settle physics with 10 random scenarios + velocity-based pin collision, stealth admin target-lock (no visible admin UI), winner modal + WA copy
- `public/manifest.json` + `public/sw.js` + `public/icon.svg` + `public/icons/` + `public/qris.png` — PWA shell (SW precaches app shell including `/qris.png`, never `/api/*`)
- `functions/api/[[path]].js` — the entire backend: one catch-all router for all `/api/*` routes
- `schema.sql` — DDL + seed data (13 members, dues Rp 10.000/mo from 2026-07, Sep 2026 has 3 unpaid: RAKA/BAYU/INDRA, 2 expenses, goals table + seed)
- `migrate_goals.sql` — idempotent goals-table migration for live DBs created before goals existed (fresh `schema.sql` DBs skip it)
- `migrate_custom_dues.sql` — idempotent backfill (`UPDATE payments SET amount=10000 WHERE amount IS NULL`); `payments.amount` has existed since the first schema, so this only normalizes legacy NULL rows
- `wrangler.toml` — Pages + D1 binding (`DB`); `database_id` already filled in (real)
- `DEPLOY.md` — full deploy/runbook (bind D1 as `DB`, set `ADMIN_KEY` secret, §3b goals migration, smoke tests)

## Commands

```bash
# syntax-check backend (bracket filename — quote it)
node --check 'functions/api/[[path]].js'

# syntax-check an inline page script: extract <script>...</script> to a temp file, then node --check it
node -e "const fs=require('fs');const h=fs.readFileSync('public/spin.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');fs.writeFileSync(process.env.CLAUDE_JOB_DIR+'/tmp/spin-check.js',m);" && node --check "$CLAUDE_JOB_DIR/tmp/spin-check.js"

# D1 ops
wrangler d1 execute kas_regu_3 --file=./schema.sql
wrangler d1 execute kas_regu_3 --file=./migrate_goals.sql   # live DBs lama saja (idempotent)
wrangler d1 execute kas_regu_3 --file=./migrate_custom_dues.sql   # backfill NULL amounts (idempotent)
wrangler d1 execute kas_regu_3 --command="SELECT COUNT(*) FROM payments;"
wrangler d1 export kas_regu_3 --output=backup.sql

# rotate admin password (never commit it — lives only as a Pages secret)
wrangler pages secret put ADMIN_KEY --project-name=kas-regu-3

# smoke test prod
curl -s "https://<project>.pages.dev/api/summary?months=2026-07,2026-08,2026-09"
```

There is no build, lint, or test suite. Verification = `node --check` (+ numeric curve simulation in node for wheel-physics changes) + `curl` + open `/`, `/admin.html`, `/spin.html`.

## Architecture

**Request flow:** browser `fetch('/api/summary?months=...')` → `functions/api/[[path]].js:onRequest` strips the `/api/` prefix and dispatches on method+path → D1 via prepared statements (`env.DB.prepare(...).bind(...)`) → JSON.

**`GET /api/summary` payload** (the only read endpoint; all pages render entirely from it): `total_income`, `total_expense`, `current_balance` (all-time `SUM`s over full tables), `month_fee`, `months` (filtered; falls back to `["2026-07","2026-08","2026-09"]` when empty), `available_months` (distinct months in DB plus any requested), `per_month[]` (`total` = `SUM(amount)` over the month, so custom nominals flow into the per-month chips and income), `members[]` (each: `paid{YYYY-MM:bool}`, `paid_count`, `unpaid_count`, `total_paid` = sum of actual `payments.amount` **over the requested months filter** — the Total column follows the displayed period, `amounts{YYYY-MM:number}` = per-cell nominal for badges), `expenses[]`, `goal` (nullable: `title`, `target_amount`, `sibagi_url`, `external_funds`, `total_collected` = balance + external, `percentage` capped at 100, `remaining` floored at 0). The goals query is wrapped in try/catch so old un-migrated DBs return `goal: null` instead of 500ing.

**Routes:** public `GET /api/summary`, `GET /api/members`, `POST /api/auth/login`; admin (Bearer `ADMIN_KEY` via `isAdmin()`): `POST /api/payments/toggle` (`{member_id, month_period, status, amount?}`; omitted/invalid amount → `MONTH_FEE`, custom validated as positive int ≤ 100jt; paid uses SQLite UPSERT so re-saving a cell overwrites the nominal, unpaired rows delete), `POST /api/expenses`, `DELETE /api/expenses/:id`, `POST /api/members` (`{name}` add / `{id,is_active}` toggle), `POST /api/goal/update` (upserts the single active row; validates title, target>0, ext≥0, http(s) URL).

**Auth model:** `POST /api/auth/login {password}` returns `{token}` where token == `env.ADMIN_KEY` verbatim. Admin routes check `Authorization: Bearer <ADMIN_KEY>`. Token persists in `sessionStorage`. No JWT, no hashing — by design for a single-password team tool.

**Frontend pattern (index/admin):** module-level `ACTIVE[]` (selected months) → `load()` fetches summary → `render(payload)` rebuilds chips/table/lists. Admin adds `TOKEN`, `DATA`, and optimistic UI on toggle (flips badge + adjusts Total instantly, then `load()` re-syncs). Shared helpers are copy-pasted per page (`rp`, `namaBulan`, `tglID`, `copyText`, `buildWAText`, `unpaidList`, plus `shortAmt`/`shortRp` which abbreviate custom nominals as `25k`) — keep them in sync when changing one.

**Custom dues UX:** quick-tap on a badge still toggles paid (at `month_fee`)/unpaid. The ✏️ button per cell opens `#payModal` ("Setor Iuran {name} – {bulan}") with chips 10k/20k/50k/100k + manual input, *Simpan Setoran* (upserts via toggle with `amount`), and *Jadikan belum lunas* (deletes). Cells whose nominal ≠ fee render amber `✓ 25k` badges (both pages, full `rp()` in `title`); flat-fee cells keep the plain green `✓`. The admin optimistic flip subtracts the *previous* cell amount before adding the new one — required since custom nominals make the delta non-uniform.

**Wheel physics (spin.html):** `doSpin()` picks winner index `k` (fair random, or locked `rigTargetId`) → `spinToIndex(k)` runs phase 1 (fast easeOutQuint to a per-scenario anchor) then a **segment queue** (`stepFrame` executes `{dur, fn(s01,t)→angle, needle, tickGap?, hit?}` segments in order, ending in `endSpin()` which snaps `rot` exactly to the winner center and resolves the winner **by id** so mid-spin checklist edits can't shift the result). Each spin draws `SCEN = floor(random*10)` (SNAP_ESCAPE, DEEP_RECOIL, DEAD_STOP, DOUBLE_WOBBLE, SLOW_CREEP, SOFT_CUSHION, PIN_CHATTER, HEAVY_HESITATION, MICRO_RECOIL, SMOOTH_DRIFT) plus an emergent **pin verdict**: residual speed `vHit ~ U(0.25,1)` vs pin break-point `Vbrk ~ U(0.35,0.9)` → `break` (pass through, only crossing ticks) or `rebound` (CLACK via `clackSound()` scaled by `vHit`, then `throwBack` ∝ `vHit`, pause, second-push `snapForward`). Helpers: `impactPress` / `throwBack` / `snapForward`. Needle modes: `tickvel` (velocity + crossing ticks), `vel` (silent), `bend` (pinned flex), `rattle` (timer chatter), `still` (silence). All curves are formulated relative to `to` (winner center) and converge there — stealth targets stay 100% accurate.

**Stealth admin lock (spin.html):** no visible admin UI. Triple-click the 🎡 in the title (`#stealthTrig`, 1200ms window) → `#stealthModal` (fair radio / lock-winner radio + `#targetSel` dropdown). Locking a winner verifies the password via `POST /api/auth/login` before arming `rigTargetId`. After a locked target wins once, `finish()` silently resets `rigTargetId` to null. No token is stored for spin.

## Gotchas

- **Two notions of "current month":** `THIS_MONTH` is wall-clock local time (drives the "Bulan Ini" highlight, unpaid filter, WA text). The month *chips* are an independent display filter. Don't conflate them.
- **`total_paid` is filter-scoped** (sums amounts over requested months), while income/expense/balance totals are all-time — this is intentional.
- **Wheel continuity rule:** every segment `fn` must return exactly the previous segment's end angle at `s01=0`, and the final segment must converge exactly to `to` (`endSpin()` snaps any ≤1e-4 residue). A teleport shows as a visible jump; verify physics edits by simulating the curves in node (start error, max per-frame step, end error) before committing.
- **`PATCH /api/members/*` is gated in `needsAuth` but has no handler** — it 404s. Member toggling goes through `POST /api/members {id, is_active}`.
- **Sticky name column** needs solid `background-color` on `td:first-child` per zebra row, or scrolled cells bleed through.
- **`PAY_INFO` config** at the top of `index.html`'s script now holds real values (Mandiri / `1320029463834` / NOOR SANIA, `qrisImg: '/qris.png'`). Keep it in sync with `public/qris.png`.
- **Bump `CACHE` in `sw.js`** whenever the precached shell changes (currently `kas-regu-3-v2`), or installed PWAs keep serving the old assets.
- Clipboard uses `navigator.clipboard` with a `textarea`+`execCommand` fallback for non-HTTPS/old browsers.
- Git Bash quoting is fragile: grep page IDs as `id="x"` (no backslash-escaped quotes), and quote the bracket API filename in `node --check`.
