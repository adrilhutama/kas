# KAS REGU 3 — Quick Reference & Workflow

## Project Summary
- Static dark-mode pages on **Cloudflare Pages**
- Single API router: `functions/api/[[path]].js`
- Database: **Cloudflare D1** (`kas_regu_3`)
- Storage: **R2 bucket** `kas-receipts` (binding: `RECEIPTS_BUCKET`)
- Deployment: `git push origin main` → auto-deploy

## Installation Checklist (one-time setup)

### CLI Tools
```bash
# Wrangler (already installed via npm global)
wrangler --version  # should show 4.x.x

# Optional: verify D1 binding
wrangler d1 execute kas_regu_3 --command="SELECT 1"
```

### Claude Code Settings
- **MCP servers**: `filesystem` + `memory` (configured in `.claude/settings.json`)
- **Skills**: antislop suite for AI coding hygiene
- **Pre-commit hook**: runs syntax checks automatically

## Daily Workflow

### Safe Edit Pattern
1. Read the full file first (don't guess structure)
2. Use **targeted edits** — never bulk replace
3. Run inline script syntax check before committing
4. Test on mobile width (375px) for responsive changes

### Commit Discipline
```bash
# Always use descriptive messages with conventional format
git commit -m "fix(ui): prevent stat card truncation on mobile"
git commit -m "feat(canvas): add dynamic member notes"
```

**Never force-push to `main`** — auto-deploy will break.

## Key Files

| File | Purpose |
|------|---------|
| `public/index.html` | Public read-only view |
| `public/admin.html` | Admin dashboard (auth-gated) |
| `public/spin.html` | Wheel of fortune (backup duty) |
| `functions/api/[[path]].js` | All API routes |
| `public/sw.js` | PWA service worker |
| `schema.sql` | D1 database schema |

## Common Operations

### Syntax Check (pre-commit hook does this automatically)
```bash
node --check 'functions/api/[[path]].js'
# For each page:
node -e "const fs=require('fs');const h=fs.readFileSync('public/index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');fs.writeFileSync('tmp-check.js',m);" && node --check tmp-check.js
```

### Database Migration
```bash
# Check current state
wrangler d1 execute kas_regu_3 --command="SELECT COUNT(*) FROM members;"

# Run migration
wrangler d1 execute kas_regu_3 --file=./migrate_goals.sql
```

### Deploy Verification
```bash
# Smoke test API
curl -s "https://kas.pages.dev/api/summary" | jq .

# Check deployed cache version
curl -sI https://kas.pages.dev/index.html | grep -i cache
```

## Anti-Patterns to Avoid

### ❌ Don't
- Parallel sub-agents (triggers 15 req/min rate limit)
- `git push --force` to `main`
- Touching JS logic during styling changes
- Forgetting to bump `CACHE` in `sw.js` after shell changes

### ✓ Do
- One-at-a-time edits with `Read` before `Edit`
- Verify `step="1"` on all 4 nominal inputs
- Test mobile view (375px viewport)
- Use `antislop-layoutmobile` skill before responsive work

## Useful Skills

| Skill | When to Use |
|-------|-------------|
| `antislop` | Before any code generation |
| `antislop-layoutmobile` | Responsive/mobile layout changes |
| `antislop-ui` | Color/theme/component updates |
| `security-review` | Auth/R2/expense changes |
| `code-review` | Before merging any feature |

## Troubleshooting

### Matriks doesn't scroll on mobile
- Check wrapper has `overflow-x-auto`
- Table needs `min-w-[500px]` or wider
- Sticky column needs solid background color

### Cache not updating
- Bump `CACHE` in `public/sw.js`
- Update matching line in `CLAUDE.md`
- Hard-refresh browser (Cmd+Shift+R)

### Syntax check fails
- Extract inline script to temp file
- Run `node --check` on it
- Fix unterminated strings/brackets
