import fs from 'fs';
import path from 'path';
import { Audit, BlobRef } from './types';
import { parseKeywordPositions, parseBacklinks, computeContentGap, computeBacklinkGap, BacklinkGapRow } from './semrush/parser';
import { KeywordRow, BacklinkRow, KeywordGapRow } from './semrush/types';
import { hostnameOf } from './utils';

export interface ParsedAuditData {
  /** Client's own keyword positions (sorted by volume desc). */
  clientKeywords: KeywordRow[];
  /** Map of competitor URL -> their keyword positions. */
  competitorKeywords: Record<string, KeywordRow[]>;
  /** Client's own backlinks (toxic flag set). */
  clientBacklinks: BacklinkRow[];
  /** Total backlinks count, total RDs count, % toxic. */
  backlinkStats: {
    totalBacklinks: number;
    totalReferringDomains: number;
    toxicCount: number;
    toxicPercent: number;
    legitDomains: { domain: string; dr: number }[];
  };
  /** Content gap rows (sorted by impact). */
  contentGap: KeywordGapRow[];
  /** Backlink gap rows. */
  backlinkGap: BacklinkGapRow[];
}

/**
 * Resolve a BlobRef to readable text. Prefers fetching from the URL when it's
 * a fully-qualified Vercel Blob URL; falls back to local filesystem otherwise.
 */
async function readBlobText(blob: BlobRef): Promise<string | null> {
  if (blob.url && /^https?:\/\//.test(blob.url)) {
    try {
      const res = await fetch(blob.url);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }
  if (blob.pathname) {
    const fp = path.join(process.cwd(), blob.pathname);
    if (fs.existsSync(fp)) return fs.readFileSync(fp, 'utf-8');
  }
  return null;
}

/**
 * Load + parse all uploaded CSVs for an audit. Returns null when no parseable
 * data exists (the audit just hasn't reached Phase 3 v2 stage yet).
 */
export async function loadParsedAuditData(audit: Audit): Promise<ParsedAuditData | null> {
  const clientDomain = audit.client.url ? hostnameOf(audit.client.url) : '';

  // ----- Client keywords -----
  let clientKeywords: KeywordRow[] = [];
  if (audit.uploads.keywordsClientCsv) {
    const text = await readBlobText(audit.uploads.keywordsClientCsv);
    if (text) clientKeywords = parseKeywordPositions(text).rows;
  }

  // ----- Competitor keywords -----
  const competitorKeywords: Record<string, KeywordRow[]> = {};
  const compCsvs = audit.uploads.keywordsCompetitorCsvs || [];
  for (let i = 0; i < compCsvs.length; i++) {
    const competitor = audit.competitors[i];
    if (!competitor) continue;
    const text = await readBlobText(compCsvs[i]);
    if (text) competitorKeywords[competitor.url] = parseKeywordPositions(text).rows;
  }

  // ----- Backlinks -----
  let clientBacklinks: BacklinkRow[] = [];
  if (audit.uploads.backlinksCsv) {
    const text = await readBlobText(audit.uploads.backlinksCsv);
    if (text) clientBacklinks = parseBacklinks(text).rows;
  }
  const referringDomainsSet = new Set(clientBacklinks.map((b) => b.sourceDomain));
  const toxic = clientBacklinks.filter((b) => b.isToxic);
  const legitMap: Record<string, number> = {};
  for (const b of clientBacklinks) {
    if (b.isToxic) continue;
    const d = b.sourceDomain;
    legitMap[d] = Math.max(legitMap[d] || 0, b.sourceDr || b.sourceAs || 0);
  }
  const legitDomains = Object.entries(legitMap)
    .map(([domain, dr]) => ({ domain, dr }))
    .sort((a, b) => b.dr - a.dr);

  const backlinkStats = {
    totalBacklinks: clientBacklinks.length,
    totalReferringDomains: referringDomainsSet.size,
    toxicCount: toxic.length,
    toxicPercent: clientBacklinks.length > 0 ? (toxic.length / clientBacklinks.length) * 100 : 0,
    legitDomains,
  };

  // ----- Content gap -----
  const perDomainKeywords = [
    { domain: clientDomain, rows: clientKeywords },
    ...Object.entries(competitorKeywords).map(([url, rows]) => ({ domain: hostnameOf(url), rows })),
  ];
  const contentGap = clientDomain ? computeContentGap(clientDomain, perDomainKeywords) : [];

  // ----- Backlink gap (only when we have competitor backlink data, currently we don't pull it) -----
  // Phase 3 v3: add competitor backlinks upload to the wizard. Until then, pass empty.
  const backlinkGap: BacklinkGapRow[] = computeBacklinkGap([], clientDomain, 2);

  return {
    clientKeywords: clientKeywords.sort((a, b) => b.volume - a.volume),
    competitorKeywords,
    clientBacklinks,
    backlinkStats,
    contentGap,
    backlinkGap,
  };
}

/**
 * Lightweight heuristic to bucket keywords into primary / secondary / long-tail
 * for Section 2's keyword strategy table.
 */
export function bucketKeywords(rows: KeywordRow[]) {
  const primary = rows.filter((r) => r.volume >= 200).slice(0, 15);
  const secondary = rows.filter((r) => r.volume >= 50 && r.volume < 200).slice(0, 15);
  const longTail = rows.filter((r) => r.volume < 50).slice(0, 15);
  return { primary, secondary, longTail };
}
