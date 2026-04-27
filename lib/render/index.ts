import fs from 'fs';
import path from 'path';
import { Audit } from '../types';
import { renderHead, renderClose } from './template';
import { renderCover } from './sections/cover';
import { renderToc, TocEntry } from './sections/toc';
import { renderRevenue } from './sections/revenue';
import { renderSection1Serp } from './sections/section-1-serp';
import { renderSection2Keywords } from './sections/section-2-keywords';
import { renderSection3Technical } from './sections/section-3-technical';
import { renderSection4Content } from './sections/section-4-content';
import { renderSection5Local } from './sections/section-5-local';
import { renderSection6CompetitorDashboard } from './sections/section-6-competitor';
import { renderSection7Backlinks } from './sections/section-7-backlinks';
import { renderSection8Trends, hasGa4OrGscData } from './sections/section-8-trends';
import { renderSection9Advanced } from './sections/section-9-advanced';
import { ParsedAuditData, loadParsedAuditData } from '../parsed';
import { loadCachedClientPair } from '../lighthouse-cache';
import type { LighthouseResult } from '../lighthouse';
import { readCachedNarratives, Narratives } from '../narratives-cache';

type LhPair = { mobile?: LighthouseResult; desktop?: LighthouseResult };

interface SectionDef {
  title: string;
  render: (
    audit: Audit,
    num: number,
    parsed?: ParsedAuditData,
    lighthouse?: LhPair,
    narratives?: Narratives
  ) => string;
}

/**
 * Build the active section list for an audit. Section 8 (GSC + GA4 Trend Analysis)
 * is included only when the audit has uploaded GA4 or GSC CSV data — otherwise it
 * is skipped entirely and the Advanced Executive Summary takes its number.
 */
function buildSectionList(audit: Audit): (SectionDef & { num: number })[] {
  const sections: SectionDef[] = [
    { title: 'SERP Competitive Analysis', render: renderSection1Serp },
    { title: 'Keyword Strategy & Gap Analysis', render: renderSection2Keywords },
    { title: 'Technical SEO', render: renderSection3Technical },
    { title: 'Site-Wide Content Audit', render: renderSection4Content },
    { title: 'Local SEO & Map Pack Deep Dive', render: renderSection5Local },
    { title: 'Deep Competitor Comparison Dashboard', render: renderSection6CompetitorDashboard },
    { title: 'Backlink Audit', render: renderSection7Backlinks },
  ];
  if (hasGa4OrGscData(audit)) {
    sections.push({ title: 'GSC + GA4 Trend Analysis', render: renderSection8Trends });
  }
  sections.push({ title: 'Advanced SEO & Final Executive Summary', render: renderSection9Advanced });
  return sections.map((s, i) => ({ ...s, num: i + 1 }));
}

/**
 * Resolve a logo source for the audit, returning a data: URI when possible.
 * Logos uploaded via Vercel Blob already have a public URL we can pass through.
 * Logos saved locally (dev mode) get inlined as base64 so the print-ready document
 * is fully self-contained.
 */
function resolveLogoSrc(audit: Audit): string {
  const blob = audit.client.logoBlob;
  if (!blob) return '';
  // Hosted Vercel Blob URL - pass through.
  if (blob.url && blob.url.startsWith('http')) return blob.url;
  // Local dev path - inline as data URI.
  if (blob.pathname) {
    const fp = path.join(process.cwd(), blob.pathname);
    if (fs.existsSync(fp)) {
      const buf = fs.readFileSync(fp);
      const mime = blob.contentType || 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  }
  return '';
}

function reportingMonth(): string {
  const now = new Date();
  return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export async function renderAuditHtml(audit: Audit): Promise<string> {
  const month = reportingMonth();
  const logo = resolveLogoSrc(audit);
  const head = renderHead({
    clientName: audit.client.name || 'Client',
    brandAccentColor: audit.client.brandAccentColor || '#dc2626',
    reportingMonth: month,
  });

  const parsed = await loadParsedAuditData(audit).catch(() => null);
  const lighthouse: LhPair | undefined = audit.client.url
    ? loadCachedClientPair(audit.id, audit.client.url)
    : undefined;
  const narratives = readCachedNarratives(audit.id);
  const sections = buildSectionList(audit);
  const tocEntries: TocEntry[] = sections.map(({ num, title }) => ({ num, title }));

  const body = [
    renderCover(audit, logo, month),
    renderToc(audit, logo, tocEntries),
    renderRevenue(audit),
    ...sections.map((s) => s.render(audit, s.num, parsed || undefined, lighthouse, narratives)),
  ].join('\n\n');

  return `${head}${body}\n${renderClose()}`;
}

/** Optional: if `?print=1` is set, inject a tiny script to fire window.print() on load. */
export function injectPrintTrigger(html: string): string {
  const script = `
<script>
  window.addEventListener('load', function() { setTimeout(function(){ window.print(); }, 400); });
</script>`;
  return html.replace('</body>', `${script}</body>`);
}
