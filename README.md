# Makarios — Client Website Auditor

A Next.js web app for building **comprehensive client SEO audits** for Makarios Marketing's paying clients.

This is the higher-tier counterpart to the existing TikTok lead-magnet audit skill — same Heat City visual layout, expanded with **9 sections** including a **Map Pack Ranking Matrix** and **Deep Competitor Comparison Dashboard**, and **no Book-a-Call CTA page** (the audience already trusts us).

## Architecture

```
Next.js 16 (App Router) + React 19 + Tailwind 4
   │
   ├── Login (cookie middleware, ADMIN_PASSWORD)
   ├── Dashboard
   ├── Audits list / detail / preview / new-wizard (8 steps)
   ├── Settings (Makarios brand defaults, Map Pack templates, revenue assumptions)
   └── API routes
        ├── /api/audits              CRUD + upload + generate + status
        └── /api/settings            Read/write app config

Storage:
   ├── data/audits.json              Index of all audits (committed)
   ├── data/audits/<id>/             Per-audit input + parsed CSVs + render.html
   ├── data/settings.json            App defaults (committed)
   └── Vercel Blob                   Logos, raw CSVs, screenshots, generated PDFs

Generation pipeline (Phase 3):
   ├── PageSpeed Insights API        Lighthouse-equivalent audits
   ├── @anthropic-ai/sdk             Section-by-section narrative writing
   ├── papaparse                     Semrush + GA4 + GSC CSV parsing
   ├── fast-xml-parser               Sitemap parsing
   └── window.print() + paged CSS    Client-side PDF generation
```

## Local Development

```bash
npm install
cp .env.example .env.local
# Set ADMIN_PASSWORD at minimum
npm run dev
# http://localhost:3000
```

## Deployment to Vercel (auto-deploy on push)

### Step 1 — Create the GitHub repo

```bash
# From this directory (already initialized as a git repo)
gh repo create makarios-client-auditor --private --source=. --push
# OR manually:
#   1. Create the repo at https://github.com/new
#   2. git remote add origin git@github.com:YOUR_USER/makarios-client-auditor.git
#   3. git push -u origin main
```

### Step 2 — Connect Vercel

1. Go to https://vercel.com/new
2. **Import Git Repository** → pick the repo you just pushed
3. Framework preset: **Next.js** (auto-detected). Leave everything else default.
4. **Don't deploy yet** — set env vars first.

### Step 3 — Set environment variables

In the Vercel project settings → Environment Variables, add:

| Variable | Required | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | The login password |
| `ANTHROPIC_API_KEY` | ✅ | For section narratives. Get one at console.anthropic.com |
| `PAGESPEED_API_KEY` | ✅ | **Required in production** — Lighthouse CLI fallback only works locally. Get a free key at developers.google.com/speed/docs/insights/v5/get-started |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Auto-set when you enable Blob in step 4 |
| `GITHUB_TOKEN` | ✅ | Personal access token with `repo` + `actions:write` scope. Used to commit audits.json + generated artifacts back to the repo, since Vercel's filesystem doesn't persist between requests. |
| `GITHUB_OWNER` | ✅ | Your GitHub username |
| `GITHUB_REPO` | ✅ | The repo name (e.g. `makarios-client-auditor`) |
| `GITHUB_BRANCH` | optional | Defaults to `main` |

### Step 4 — Enable Vercel Blob

Storage → **Create Database** → **Blob** → **Connect to project**. This auto-injects `BLOB_READ_WRITE_TOKEN` for you.

### Step 5 — Mirror the secrets to GitHub Actions

For the audit-generation workflow to run, add the same variables under repo Settings → Secrets and variables → **Actions**: `ANTHROPIC_API_KEY`, `PAGESPEED_API_KEY`, `BLOB_READ_WRITE_TOKEN`.

### Step 6 — Deploy

Click **Deploy**. Every subsequent `git push` to `main` will trigger an auto-deploy.

## Production gotchas (read this)

A few places where the dev workflow differs from prod:

1. **No Lighthouse CLI in production** — Vercel functions don't have the `lighthouse` binary, so production must use PSI API. The code auto-detects: if `PAGESPEED_API_KEY` is set, it uses PSI; otherwise it tries the local CLI. Without a key in prod, Section 3 will be empty.

2. **Function timeouts on Hobby plan** — `/api/audits/[id]/generate` runs Lighthouse + Claude inline (~2 min). Vercel **Hobby** caps functions at 60s. Either upgrade to **Pro** (300s cap) or split the work: GitHub Actions runs the heavy generation, Vercel just dispatches and reads results.

3. **Filesystem writes don't persist** — Lighthouse + narrative caches are written via `fs.writeFileSync` which works in dev but vanishes between requests on Vercel. The fix is committing artifacts back to the repo via `lib/github.ts:commitJsonFile`. The scaffolding is in place; the cache modules need a small refactor (~30 min of work) to call it.

4. **Audits list won't survive across deploys** — same root cause: `data/audits.json` writes don't persist on Vercel. Same fix: commit-back via `lib/github.ts`. Until that lands, treat the production deploy as a static dashboard for audits committed via `git push`, not a live database.

The cleanest production-ready setup runs the heavy audit generation from GitHub Actions (which has full Node + filesystem access and longer timeouts), commits results back to the repo, and lets Vercel just serve the dashboard. The workflow at `.github/workflows/generate-audit.yml` is already wired for this.

## Audit structure (final PDF)

Cover · TOC · Revenue Opportunity · §1 SERP Competitive Analysis · §2 Keyword Strategy & Gap Analysis · §3 Technical SEO · §4 Site-Wide Content Audit · §5 Local SEO & Map Pack Deep Dive (with Map Pack Ranking Matrix) · §6 Deep Competitor Comparison Dashboard · §7 Backlink Audit · §8 GSC + GA4 Trend Analysis · §9 Advanced SEO & Final Executive Summary.

**No Book-a-Call CTA page** — paying clients only.

## PDF generation

Browser-native print dialog. Click **Save as PDF** on the audit detail page → opens `/audits/<id>/preview?print=1` in a new tab → triggers `window.print()` → user picks "Save as PDF" in the destination dropdown. Paged CSS rules (`@page`, page counters, page breaks) render at full fidelity.

## Reference

- Architecture: `../mexhome-competitor-intel/`
- Audit content/design: `../.claude/skills/tiktok-audit/SKILL.md` + `HeatCity_canonical_template.html`
- Reference deliverable: `../Website Audit winner/HeatCityDetailing_Comprehensive_SEO_Audit.pdf`
- Client-data workflow: `../.claude/skills/seo-performance-report/SKILL.md`

## Phase status

- [x] Phase 1 — Plan
- [x] Phase 2 — Scaffold
- [x] Phase 3 v1 — Render system (template + 9 sections + Map Pack matrix + orchestrator + preview route)
- [x] Phase 3 v2 — Real data ingestion (Semrush parsers, parsed.ts loader, Lighthouse + PSI/CLI wrapper, results cached)
- [x] Phase 3 v3 — Claude narrative with prompt caching across all 8 narrative slots
- [x] Phase 3 verified end-to-end against BraceLab fixture
- [ ] Phase 4 — Production storage refactor (lighthouse + narrative caches → commit-back via GitHub)
- [ ] Phase 4 — §4 Site-Wide Content Audit crawler
- [ ] Phase 4 — Local Dominator API integration (currently screenshot-upload only)
