/* eslint-disable no-console */
/**
 * Audit-generation pipeline entry point.
 *
 * Runs the same logic as POST /api/audits/[id]/generate but from the command line,
 * so GitHub Actions can invoke it without needing an HTTP server.
 *
 * Usage:
 *   npm run audit:generate -- <auditId>
 *   AUDIT_ID=<auditId> npm run audit:generate
 *
 * Required env vars:
 *   PAGESPEED_API_KEY  (or, for local-dev fallback, lighthouse CLI on PATH)
 *   ANTHROPIC_API_KEY  (optional; if absent, narrative generation is skipped)
 */

import fs from 'fs';
import path from 'path';
import { Audit } from '../lib/types';
import { fetchAndCachePair } from '../lib/lighthouse-cache';
import { loadParsedAuditData } from '../lib/parsed';
import { generateNarratives, isClaudeConfigured } from '../lib/claude';
import { writeCachedNarratives } from '../lib/narratives-cache';
import { loadCachedClientPair } from '../lib/lighthouse-cache';

const auditId = process.argv[2] || process.env.AUDIT_ID;
if (!auditId) {
  console.error('Usage: npm run audit:generate -- <auditId>');
  process.exit(1);
}

const indexPath = path.join(process.cwd(), 'data', 'audits.json');
if (!fs.existsSync(indexPath)) {
  console.error('No data/audits.json found.');
  process.exit(1);
}

const idx = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as { audits: Audit[] };
const audit = (idx.audits || []).find((a) => a.id === auditId);
if (!audit) {
  console.error(`Audit ${auditId} not found in index.`);
  process.exit(1);
}

console.log(`[generate-audit] Starting pipeline for ${audit.id} (${audit.slug})`);
const errors: string[] = [];

(async () => {
  // ---- Step 1: Lighthouse / PSI for client URL ----
  if (audit.client.url) {
    console.log(`[generate-audit] Running Lighthouse for ${audit.client.url}...`);
    try {
      const pair = await fetchAndCachePair(audit.id, audit.client.url);
      console.log(
        `[generate-audit]   mobile perf=${pair.mobile.scores.performance} desktop perf=${pair.desktop.scores.performance}`
      );
      if (pair.mobile.error) errors.push(`Lighthouse mobile: ${pair.mobile.error}`);
      if (pair.desktop.error) errors.push(`Lighthouse desktop: ${pair.desktop.error}`);
    } catch (err) {
      errors.push(`Lighthouse: ${(err as Error).message}`);
    }
  }

  // ---- Step 2: Claude narrative ----
  if (isClaudeConfigured()) {
    console.log(`[generate-audit] Generating Claude narratives...`);
    try {
      const parsed = (await loadParsedAuditData(audit).catch(() => undefined)) || undefined;
      const lighthouse = audit.client.url ? await loadCachedClientPair(audit.id, audit.client.url) : undefined;
      const narratives = await generateNarratives({ audit, parsed, lighthouse });
      await writeCachedNarratives(audit.id, narratives);
      console.log(`[generate-audit]   ${Object.keys(narratives).length} sections written`);
    } catch (err) {
      errors.push(`Claude: ${(err as Error).message}`);
    }
  } else {
    console.log(`[generate-audit] ANTHROPIC_API_KEY not set — narrative generation skipped.`);
  }

  // ---- Step 3: Persist final state ----
  audit.status = errors.length > 0 && errors.length === 2 ? 'failed' : 'complete';
  audit.updatedAt = new Date().toISOString();
  if (errors.length > 0) audit.errors = errors;
  const next = idx.audits.map((a) => (a.id === audit.id ? audit : a));
  fs.writeFileSync(indexPath, JSON.stringify({ audits: next }, null, 2) + '\n', 'utf-8');

  console.log(`[generate-audit] Done. Status: ${audit.status}`);
  if (errors.length > 0) {
    console.log(`[generate-audit] Errors:\n  - ${errors.join('\n  - ')}`);
  }
})().catch((err) => {
  console.error('[generate-audit] Fatal:', err);
  process.exit(1);
});
