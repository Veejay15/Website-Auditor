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

## Deployment

1. Push this folder as its own GitHub repo
2. Connect to Vercel (Hobby tier is enough)
3. Enable Blob storage: Storage → Create Database → Blob → Connect
4. Add env vars: `ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`, `PAGESPEED_API_KEY`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `BLOB_READ_WRITE_TOKEN`
5. Add the same secrets in GitHub: Settings → Secrets and variables → Actions

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
- [x] Phase 2 — Scaffold (this commit)
- [ ] Phase 3 — Audit generation engine: `scripts/generate-audit.ts` + GitHub Actions workflow + section narrative prompts + Heat City HTML template (CTA stripped, parameterized)
- [ ] Phase 3 test — Run against BraceLab, verify pipeline end-to-end
