import { Audit } from '../../types';
import { ParsedAuditData } from '../../parsed';
import { Narratives } from '../../narratives-cache';
import { escapeHtml } from '../template';
import { hostnameOf } from '../../utils';

function kdClass(kd: number): string {
  if (kd <= 29) return 'kd-green';
  if (kd <= 49) return 'kd-amber';
  return 'kd-red';
}

export function renderSection6CompetitorDashboard(
  audit: Audit,
  num = 6,
  parsed?: ParsedAuditData,
  _lighthouse?: unknown,
  narratives?: Narratives
): string {
  void _lighthouse;
  const headerCols = audit.competitors
    .map((c) => `<th>${escapeHtml(c.label || hostnameOf(c.url))}</th>`)
    .join('');

  // ---- Side-by-side metric table ----
  const clientKwCount = parsed?.clientKeywords.length ?? null;
  const clientVolume =
    parsed?.clientKeywords.reduce((sum, k) => sum + k.volume, 0) ?? null;

  const compKwCounts = audit.competitors.map((c) => parsed?.competitorKeywords[c.url]?.length ?? null);
  const compVolumes = audit.competitors.map(
    (c) => parsed?.competitorKeywords[c.url]?.reduce((sum, k) => sum + k.volume, 0) ?? null
  );

  function metricRow(label: string, clientVal: string | number | null, compVals: (string | number | null)[]) {
    const youCell = clientVal === null ? '—' : String(clientVal);
    const comps = compVals.map((v) => `<td>${v === null ? '—' : String(v)}</td>`).join('');
    return `<tr><td><strong>${escapeHtml(label)}</strong></td><td class="you-col">${youCell}</td>${comps}</tr>`;
  }

  const metricRows = [
    metricRow('Authority Score', '—', audit.competitors.map(() => '—')),
    metricRow(
      'Ranking Keywords',
      clientKwCount !== null ? clientKwCount.toLocaleString() : null,
      compKwCounts.map((v) => (v !== null ? v.toLocaleString() : null))
    ),
    metricRow(
      'Total Search Volume (mo)',
      clientVolume !== null ? clientVolume.toLocaleString() : null,
      compVolumes.map((v) => (v !== null ? v.toLocaleString() : null))
    ),
    metricRow('Referring Domains', parsed?.backlinkStats.totalReferringDomains?.toLocaleString() ?? null, audit.competitors.map(() => null)),
    metricRow('Total Backlinks', parsed?.backlinkStats.totalBacklinks?.toLocaleString() ?? null, audit.competitors.map(() => null)),
  ].join('\n    ');

  // ---- Content gap table ----
  const gap = parsed?.contentGap || [];
  const gapRows = gap.length > 0
    ? gap
        .slice(0, 25)
        .map(
          (g) => `<tr>
        <td>${escapeHtml(g.keyword)}</td>
        <td>${g.volume.toLocaleString()}</td>
        <td><span class="${kdClass(g.kd)}">${Math.round(g.kd)}</span></td>
        <td>${g.cpc > 0 ? '$' + g.cpc.toFixed(2) : '—'}</td>
        <td>${g.competitorsRanking}</td>
        <td>${g.topRankingPosition ?? '—'}</td>
        <td>${g.kd <= 29 ? 'Build/expand page' : g.kd <= 49 ? 'Mid-term target' : 'Long-term'}</td>
      </tr>`
        )
        .join('\n      ')
    : '<tr><td colspan="7"><em>Upload one Semrush keyword positions CSV per competitor in the audit wizard. The content gap is computed as: (union of competitor keywords) − (client keywords).</em></td></tr>';

  // ---- Backlink gap (currently empty — needs competitor backlink CSVs in v3) ----
  const blgap = parsed?.backlinkGap || [];
  const blGapRows = blgap.length > 0
    ? blgap.slice(0, 30).map(
        (b) => `<tr>
        <td>${escapeHtml(b.domain)}</td>
        <td>${b.dr}</td>
        <td>—</td>
        <td>${b.linkedCompetitors.length} of ${audit.competitors.length}</td>
        <td>${b.dr >= 60 ? 'Editorial pitch' : b.dr >= 30 ? 'Guest post' : 'Directory'}</td>
      </tr>`
      ).join('\n      ')
    : '<tr><td colspan="5"><em>Upload competitor backlink CSVs (Phase 3 v3) to compute referring-domain gaps automatically.</em></td></tr>';

  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">Deep Competitor Comparison Dashboard</h2></div>
<div class="section-kicker">Side-by-side metrics, content gap, backlink gap, and on-page comparison vs. ${audit.competitors.length} direct competitors.</div>

${narratives?.['competitor-overview'] || `<p>This dashboard isolates exactly how ${escapeHtml(audit.client.name)} stacks against each direct competitor on the metrics that drive organic visibility — and pinpoints the highest-leverage gaps to close.</p>`}

<h3>Side-by-Side Metric Comparison</h3>
<table>
  <thead>
    <tr><th>Metric</th><th class="you-col">${escapeHtml(audit.client.name)} (You)</th>${headerCols}</tr>
  </thead>
  <tbody>
    ${metricRows}
  </tbody>
</table>

<h3>Content Gap — Top 25 Keywords Competitors Rank For That You Don't</h3>
<table>
  <thead><tr><th>Keyword</th><th>Volume</th><th>KD</th><th>CPC</th><th># Comps</th><th>Top Pos</th><th>Action</th></tr></thead>
  <tbody>
    ${gapRows}
  </tbody>
</table>

<h3>Backlink Gap — Referring Domains Pointing to ≥2 Competitors But Not You</h3>
<table>
  <thead><tr><th>Domain</th><th>DR</th><th>Industry</th><th>Linked Competitors</th><th>Outreach Angle</th></tr></thead>
  <tbody>
    ${blGapRows}
  </tbody>
</table>

<div class="callout callout-green">
  <h4>How to read this dashboard</h4>
  <p>Each row is a battlefront. Where your column trails the leader by &gt;30%, that's a clear, prioritizable action. The Content Gap and Backlink Gap tables convert those abstract gaps into specific keyword targets and specific outreach domains.</p>
</div>
</section>`;
}
