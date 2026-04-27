import { Audit } from '../../types';
import { ParsedAuditData, bucketKeywords } from '../../parsed';
import { KeywordRow } from '../../semrush/types';
import { Narratives } from '../../narratives-cache';
import { escapeHtml } from '../template';

function kdClass(kd: number): string {
  if (kd <= 29) return 'kd-green';
  if (kd <= 49) return 'kd-amber';
  return 'kd-red';
}

function intentLabel(raw?: string): string {
  if (!raw) return '—';
  const s = raw.trim().toUpperCase();
  if (s === 'C' || /commercial/i.test(s)) return 'Commercial';
  if (s === 'I' || /informational/i.test(s)) return 'Informational';
  if (s === 'N' || /navigational/i.test(s)) return 'Navigational';
  if (s === 'T' || /transactional/i.test(s)) return 'Transactional';
  return raw;
}

function row(k: KeywordRow): string {
  const cpc = k.cpc > 0 ? `$${k.cpc.toFixed(2)}` : '—';
  return `<tr><td>${escapeHtml(k.keyword)}</td><td>${k.volume.toLocaleString()}</td><td><span class="${kdClass(k.kd)}">${Math.round(k.kd)}</span></td><td>${cpc}</td><td>${escapeHtml(intentLabel(k.intent))}</td><td>${escapeHtml(k.url || '—')}</td></tr>`;
}

export function renderSection2Keywords(
  audit: Audit,
  num = 2,
  parsed?: ParsedAuditData,
  _lighthouse?: unknown,
  narratives?: Narratives
): string {
  void _lighthouse;
  const hasData = parsed && parsed.clientKeywords.length > 0;
  const buckets = hasData ? bucketKeywords(parsed.clientKeywords) : null;
  const gap = parsed?.contentGap || [];

  const primaryRows = buckets && buckets.primary.length > 0
    ? buckets.primary.map(row).join('\n    ')
    : `<tr><td colspan="6"><em>${parsed ? 'No keywords with volume ≥ 200 in the upload.' : 'Upload the Semrush keyword positions CSV to populate this table.'}</em></td></tr>`;
  const secondaryRows = buckets && buckets.secondary.length > 0
    ? buckets.secondary.map(row).join('\n    ')
    : `<tr><td colspan="6"><em>${parsed ? 'No mid-volume keywords (50–199 volume) in the upload.' : 'Awaiting Semrush positions data.'}</em></td></tr>`;
  const longTailRows = buckets && buckets.longTail.length > 0
    ? buckets.longTail.map(row).join('\n    ')
    : `<tr><td colspan="6"><em>${parsed ? 'No long-tail keywords (volume < 50) in the upload.' : 'Awaiting Semrush positions data.'}</em></td></tr>`;

  const gapRows = gap.length > 0
    ? gap.slice(0, 25)
        .map(
          (g) => `<tr>
        <td>${escapeHtml(g.keyword)}</td>
        <td>${g.volume.toLocaleString()}</td>
        <td><span class="${kdClass(g.kd)}">${Math.round(g.kd)}</span></td>
        <td>${g.cpc > 0 ? '$' + g.cpc.toFixed(2) : '—'}</td>
        <td>${g.competitorsRanking}</td>
        <td>${g.topRankingPosition ?? '—'} (${escapeHtml(g.topRankingDomain || '—')})</td>
        <td>${g.kd <= 29 ? 'Quick win — build/expand page' : g.kd <= 49 ? 'Mid-term target' : 'Long-term'}</td>
      </tr>`
        )
        .join('\n      ')
    : '<tr><td colspan="7"><em>Upload one Semrush keyword positions CSV per competitor to compute the content gap automatically.</em></td></tr>';

  const totalKeywords = parsed?.clientKeywords.length ?? 0;
  const totalVolume = parsed?.clientKeywords.reduce((sum, k) => sum + k.volume, 0) ?? 0;

  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">Keyword Strategy &amp; Gap Analysis</h2></div>
<div class="section-kicker">${hasData ? `${totalKeywords.toLocaleString()} ranking keywords analyzed · ${totalVolume.toLocaleString()} total monthly search volume.` : 'Verified Semrush data — primary, secondary, long-tail, and the keywords competitors rank for that you don\'t.'}</div>

${narratives?.['keyword-strategy'] || ''}

${
  hasData
    ? `<div class="stats-row">
  <div class="stat-card stat-card-hero"><span class="num">${totalKeywords.toLocaleString()}</span><span class="lbl">Ranking Keywords</span></div>
  <div class="stat-card"><span class="num">${totalVolume.toLocaleString()}</span><span class="lbl">Total Search Volume</span></div>
  <div class="stat-card"><span class="num">${buckets!.primary.length}</span><span class="lbl">Primary (≥200/mo)</span></div>
  <div class="stat-card"><span class="num">${gap.length.toLocaleString()}</span><span class="lbl">Content Gaps Found</span></div>
</div>`
    : ''
}

<h3>Primary Targets — High-Volume Head Terms</h3>
<table>
  <thead><tr><th>Keyword</th><th>Volume</th><th>KD</th><th>CPC</th><th>Intent</th><th>Target Page</th></tr></thead>
  <tbody>
    ${primaryRows}
  </tbody>
</table>

<h3>Secondary Targets — Geo &amp; Service Variants</h3>
<table>
  <thead><tr><th>Keyword</th><th>Volume</th><th>KD</th><th>CPC</th><th>Intent</th><th>Target Page</th></tr></thead>
  <tbody>
    ${secondaryRows}
  </tbody>
</table>

<h3>Long-Tail Targets — Content Marketing Opportunities</h3>
<table>
  <thead><tr><th>Keyword</th><th>Volume</th><th>KD</th><th>CPC</th><th>Intent</th><th>Target Page</th></tr></thead>
  <tbody>
    ${longTailRows}
  </tbody>
</table>

<h3>Content Gap Analysis — Keywords Competitors Rank For That You Don't</h3>
<table>
  <thead><tr><th>Keyword</th><th>Volume</th><th>KD</th><th>CPC</th><th># Comps</th><th>Top Comp</th><th>Action</th></tr></thead>
  <tbody>
    ${gapRows}
  </tbody>
</table>

${
  gap.length > 0
    ? `<div class="callout callout-green">
  <p style="margin:0;"><strong>${gap.length.toLocaleString()} content gaps identified</strong> — these are the fastest path to ranked-keyword growth, since competitors have already validated each query is winnable in your market. The top-25 highest-impact rows shown above are scored by (volume / KD) × competitor coverage.</p>
</div>`
    : ''
}
</section>`;
}
