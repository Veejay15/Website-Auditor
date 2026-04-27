import Papa from 'papaparse';
import { KeywordRow, BacklinkRow, KeywordGapRow, SemrushParseResult } from './types';
import { hostnameOf } from '../utils';

/**
 * Header-name normalizer. Matches Semrush canonical headers + common variants.
 * Returns an object mapping the column index to a normalized field key.
 */
function normalizeHeaders(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((raw, i) => {
    const h = raw.trim().toLowerCase().replace(/^﻿/, '');
    if (/^keyword\s*$/.test(h) || h === 'query') map[i] = 'keyword';
    else if (h === 'position' || h === 'pos' || h === 'rank') map[i] = 'position';
    else if (/previous\s*pos/.test(h) || h === 'prev position' || h === 'prev pos') map[i] = 'previousPosition';
    else if (/search\s*volume/.test(h) || h === 'volume' || h === 'searches') map[i] = 'volume';
    else if (/keyword\s*difficulty/.test(h) || h === 'kd' || h === 'difficulty' || h === 'kd %') map[i] = 'kd';
    else if (h === 'cpc' || /cost\s*per\s*click/.test(h) || /cpc\s*\(usd\)/.test(h)) map[i] = 'cpc';
    else if (h === 'intent' || /search\s*intent/.test(h)) map[i] = 'intent';
    else if (h === 'url' || h === 'page' || h === 'landing page') map[i] = 'url';
    else if (h === 'traffic' || h === 'organic traffic' || h === 'estimated traffic') map[i] = 'traffic';
    else if (/serp\s*features/.test(h)) map[i] = 'serpFeatures';
    // Backlink-specific
    else if (/source\s*url/.test(h) || h === 'sites' || h === 'site' || h === 'page url') map[i] = 'sourceUrl';
    else if (/source\s*title/.test(h) || h === 'page title') map[i] = 'sourceTitle';
    else if (h === 'anchor' || h === 'anchor text') map[i] = 'anchor';
    else if (/target\s*url/.test(h) || /live\s*links/.test(h)) map[i] = 'targetUrl';
    else if (/first\s*seen/.test(h) || /first\s*indexed/.test(h)) map[i] = 'firstSeen';
    else if (/last\s*seen/.test(h)) map[i] = 'lastSeen';
    else if (/page\s*score/.test(h) || /page\s*ascore/.test(h)) map[i] = 'pageScore';
    else if (/source\s*ascore/.test(h) || /source\s*as/.test(h) || /authority\s*score/.test(h)) map[i] = 'sourceAs';
    else if (/domain\s*rating/.test(h) || /\bdr\b/.test(h)) map[i] = 'sourceDr';
    else if (h === 'type' || h === 'link type' || /type\s*of\s*link/.test(h)) map[i] = 'type';
    else if (/no\s*follow/.test(h) || h === 'follow' || h === 'follow type') map[i] = 'followType';
  });
  return map;
}

function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const s = String(value).replace(/[$,%\s]/g, '');
  // Handle Semrush "K"/"M" suffix in some screenshots
  if (/[Kk]$/.test(s)) return parseFloat(s) * 1000;
  if (/[Mm]$/.test(s)) return parseFloat(s) * 1_000_000;
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = num(value);
  return n === 0 && String(value).trim() !== '0' ? null : n;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const cleaned = text.replace(/^﻿/, '');
  const result = Papa.parse<string[]>(cleaned, {
    header: false,
    skipEmptyLines: 'greedy',
    delimiter: '', // auto-detect
  });
  const all = result.data as string[][];
  if (all.length === 0) return { headers: [], rows: [] };
  return { headers: all[0], rows: all.slice(1) };
}

export function parseKeywordPositions(csvText: string): SemrushParseResult<KeywordRow> {
  const { headers, rows } = parseCsv(csvText);
  const idx = normalizeHeaders(headers);
  const fieldToCol: Record<string, number> = {};
  Object.entries(idx).forEach(([col, field]) => {
    fieldToCol[field] = Number(col);
  });
  if (fieldToCol.keyword === undefined) {
    return { rows: [], warnings: ['No "Keyword" column found.'] };
  }
  const out: KeywordRow[] = [];
  for (const row of rows) {
    const keyword = (row[fieldToCol.keyword] || '').trim();
    if (!keyword) continue;
    out.push({
      keyword,
      position: fieldToCol.position !== undefined ? numOrNull(row[fieldToCol.position]) : null,
      previousPosition:
        fieldToCol.previousPosition !== undefined ? numOrNull(row[fieldToCol.previousPosition]) : null,
      volume: fieldToCol.volume !== undefined ? num(row[fieldToCol.volume]) : 0,
      kd: fieldToCol.kd !== undefined ? num(row[fieldToCol.kd]) : 0,
      cpc: fieldToCol.cpc !== undefined ? num(row[fieldToCol.cpc]) : 0,
      intent: fieldToCol.intent !== undefined ? (row[fieldToCol.intent] || '').trim() : undefined,
      url: fieldToCol.url !== undefined ? (row[fieldToCol.url] || '').trim() : undefined,
      traffic: fieldToCol.traffic !== undefined ? num(row[fieldToCol.traffic]) : undefined,
      serpFeatures:
        fieldToCol.serpFeatures !== undefined ? (row[fieldToCol.serpFeatures] || '').trim() : undefined,
    });
  }
  return { rows: out, warnings: [] };
}

export function parseBacklinks(csvText: string): SemrushParseResult<BacklinkRow> {
  const { headers, rows } = parseCsv(csvText);
  const idx = normalizeHeaders(headers);
  const fieldToCol: Record<string, number> = {};
  Object.entries(idx).forEach(([col, field]) => {
    fieldToCol[field] = Number(col);
  });
  if (fieldToCol.sourceUrl === undefined) {
    return { rows: [], warnings: ['No source URL column found.'] };
  }
  const out: BacklinkRow[] = [];
  for (const row of rows) {
    const sourceUrl = (row[fieldToCol.sourceUrl] || '').trim();
    if (!sourceUrl || !/^https?:/.test(sourceUrl)) continue;
    const sourceDomain = hostnameOf(sourceUrl);
    out.push({
      sourceUrl,
      sourceDomain,
      sourceTitle: fieldToCol.sourceTitle !== undefined ? row[fieldToCol.sourceTitle] : undefined,
      anchor: fieldToCol.anchor !== undefined ? (row[fieldToCol.anchor] || '').trim() : undefined,
      targetUrl: fieldToCol.targetUrl !== undefined ? (row[fieldToCol.targetUrl] || '').trim() : undefined,
      firstSeen: fieldToCol.firstSeen !== undefined ? row[fieldToCol.firstSeen] : undefined,
      lastSeen: fieldToCol.lastSeen !== undefined ? row[fieldToCol.lastSeen] : undefined,
      pageScore: fieldToCol.pageScore !== undefined ? num(row[fieldToCol.pageScore]) : undefined,
      sourceAs: fieldToCol.sourceAs !== undefined ? num(row[fieldToCol.sourceAs]) : undefined,
      sourceDr: fieldToCol.sourceDr !== undefined ? num(row[fieldToCol.sourceDr]) : undefined,
      type: fieldToCol.type !== undefined ? (row[fieldToCol.type] || '').trim() : undefined,
      followType: fieldToCol.followType !== undefined ? row[fieldToCol.followType] : undefined,
    });
  }
  return { rows: classifyToxic(out), warnings: [] };
}

/**
 * Toxic-link classifier. Flags emoji-titled link farms, scraper sites, AS-0 directory
 * dumps, suspicious TLDs, and known spam patterns.
 */
function classifyToxic(rows: BacklinkRow[]): BacklinkRow[] {
  const SUSPICIOUS_TLDS = ['.icu', '.party', '.xyz', '.top', '.gq', '.tk', '.ml', '.cf', '.click', '.work'];
  const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  return rows.map((r) => {
    const reasons: string[] = [];
    const title = (r.sourceTitle || '').trim();
    if (EMOJI_RE.test(title)) reasons.push('emoji title');
    if (/(domain report|url shared|website stats|directory pages|backlink service)/i.test(title))
      reasons.push('link-farm pattern');
    if (SUSPICIOUS_TLDS.some((t) => r.sourceDomain.endsWith(t))) reasons.push('suspicious TLD');
    if ((r.sourceAs ?? r.sourceDr ?? -1) === 0) reasons.push('AS 0');
    if (/^[a-z0-9]{1,3}coint\.com$|toplikevideo|atomizelink|screenshots\.wiki|quero\.party|factmags|goooogla|grow-your\.site/i.test(r.sourceDomain))
      reasons.push('known spam network');
    return reasons.length > 0
      ? { ...r, isToxic: true, toxicReason: reasons.join(', ') }
      : { ...r, isToxic: false };
  });
}

/**
 * Compute keyword content gap: keywords competitors rank for that the client does not.
 * Inputs: array of (domain, KeywordRow[]) pairs. The first entry MUST be the client.
 */
export function computeContentGap(
  clientDomain: string,
  perDomainKeywords: { domain: string; rows: KeywordRow[] }[]
): KeywordGapRow[] {
  const clientEntry = perDomainKeywords.find((p) => p.domain === clientDomain);
  if (!clientEntry) return [];
  const clientKeys = new Set(clientEntry.rows.map((r) => r.keyword.toLowerCase()));

  // Aggregate all competitor rows by keyword.
  const byKeyword: Record<
    string,
    { example: KeywordRow; positions: Record<string, number | null> }
  > = {};
  for (const entry of perDomainKeywords) {
    if (entry.domain === clientDomain) continue;
    for (const row of entry.rows) {
      const key = row.keyword.toLowerCase();
      if (clientKeys.has(key)) continue; // Not a gap if the client also ranks.
      if (!byKeyword[key]) byKeyword[key] = { example: row, positions: {} };
      byKeyword[key].positions[entry.domain] = row.position;
    }
  }

  return Object.entries(byKeyword)
    .map(([, agg]) => {
      const positions = agg.positions;
      const ranking = Object.entries(positions).filter(([, pos]) => pos !== null && pos !== undefined);
      const top = ranking.reduce<{ domain: string; pos: number } | null>((best, [d, p]) => {
        const pp = Number(p);
        if (!best || pp < best.pos) return { domain: d, pos: pp };
        return best;
      }, null);
      return {
        keyword: agg.example.keyword,
        volume: agg.example.volume,
        kd: agg.example.kd,
        cpc: agg.example.cpc,
        intent: agg.example.intent,
        positions,
        competitorsRanking: ranking.length,
        topRankingDomain: top?.domain,
        topRankingPosition: top?.pos,
        isGap: true,
      };
    })
    .sort((a, b) => {
      // Score by (volume / max(KD, 5)) * competitorsRanking — high-volume, low-KD,
      // ranked-by-many-competitors keywords float to the top.
      const sa = (a.volume / Math.max(a.kd, 5)) * a.competitorsRanking;
      const sb = (b.volume / Math.max(b.kd, 5)) * b.competitorsRanking;
      return sb - sa;
    });
}

/**
 * Compute backlink gap: referring domains pointing to >=2 competitors but not the client.
 */
export interface BacklinkGapRow {
  domain: string;
  dr: number;
  linkedCompetitors: string[];
}

export function computeBacklinkGap(
  perDomainBacklinks: { domain: string; rows: BacklinkRow[] }[],
  clientDomain: string,
  minCompetitors = 2
): BacklinkGapRow[] {
  const clientEntry = perDomainBacklinks.find((p) => p.domain === clientDomain);
  const clientLinkSources = new Set(
    (clientEntry?.rows || []).map((r) => r.sourceDomain.toLowerCase())
  );

  const compMap: Record<string, { competitors: Set<string>; dr: number }> = {};
  for (const entry of perDomainBacklinks) {
    if (entry.domain === clientDomain) continue;
    const seenForThisCompetitor = new Set<string>();
    for (const row of entry.rows) {
      const key = row.sourceDomain.toLowerCase();
      if (clientLinkSources.has(key)) continue;
      if (seenForThisCompetitor.has(key)) continue;
      seenForThisCompetitor.add(key);
      if (!compMap[key]) compMap[key] = { competitors: new Set(), dr: row.sourceDr || 0 };
      compMap[key].competitors.add(entry.domain);
      if ((row.sourceDr || 0) > compMap[key].dr) compMap[key].dr = row.sourceDr || 0;
    }
  }

  return Object.entries(compMap)
    .filter(([, v]) => v.competitors.size >= minCompetitors)
    .map(([domain, v]) => ({
      domain,
      dr: v.dr,
      linkedCompetitors: Array.from(v.competitors),
    }))
    .sort((a, b) => b.dr - a.dr || b.linkedCompetitors.length - a.linkedCompetitors.length);
}
