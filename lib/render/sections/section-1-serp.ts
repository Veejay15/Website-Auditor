import { Audit } from '../../types';
import { ParsedAuditData } from '../../parsed';
import { Narratives } from '../../narratives-cache';
import { escapeHtml } from '../template';
import { hostnameOf } from '../../utils';

export function renderSection1Serp(
  audit: Audit,
  num = 1,
  _parsed?: ParsedAuditData,
  _lighthouse?: unknown,
  narratives?: Narratives
): string {
  void _parsed;
  void _lighthouse;
  const competitorRows = audit.competitors
    .map(
      (c, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(hostnameOf(c.url))}</td><td>${escapeHtml(c.label)}</td><td>Direct competitor</td></tr>`
    )
    .join('\n      ');
  const lead = narratives?.['serp-overview'] || `<p>This section maps the search results pages (SERPs) for your highest-value commercial queries, identifies the businesses winning each top-10, and isolates the gaps where ${escapeHtml(audit.client.name)} can realistically displace them.</p>`;

  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">SERP Competitive Analysis</h2></div>
<div class="section-kicker">Who is winning the clicks you want — and why Google ranks them.</div>

${lead}

<h3>Direct Competitors Identified</h3>
<table>
  <thead><tr><th>#</th><th>Domain</th><th>Business</th><th>Type</th></tr></thead>
  <tbody>
    ${competitorRows || '<tr><td colspan="4">Add competitors in the audit wizard to populate this section.</td></tr>'}
  </tbody>
</table>

<div class="callout callout-amber">
  <h4>Phase 3 work — auto-populated from Semrush + WebSearch</h4>
  <p>Per-keyword SERP tables (volume, KD, CPC, intent), top-10 ranking pages, Map Pack snapshot, and "Your Position: Not ranking" callouts will be generated automatically once the Semrush positions CSV is parsed and the WebSearch SERP scraper is wired in.</p>
</div>

<div class="callout callout-gray">
  <h4>What this section will contain (final form)</h4>
  <ul>
    <li>3–4 highest-value primary keywords with full stat cards (volume, KD, CPC, intent)</li>
    <li>Top-10 SERP table per keyword + Map Pack mention</li>
    <li>"Key Takeaways" callout per keyword identifying the displacement strategy</li>
    <li>Cross-keyword competitor frequency analysis (who appears the most across your target SERPs)</li>
  </ul>
</div>
</section>`;
}
