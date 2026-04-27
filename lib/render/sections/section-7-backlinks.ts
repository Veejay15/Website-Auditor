import { Audit } from '../../types';
import { ParsedAuditData } from '../../parsed';
import { Narratives } from '../../narratives-cache';
import { escapeHtml } from '../template';

export function renderSection7Backlinks(
  audit: Audit,
  num = 7,
  parsed?: ParsedAuditData,
  _lighthouse?: unknown,
  narratives?: Narratives
): string {
  void _lighthouse;
  const hasData = parsed && parsed.clientBacklinks.length > 0;
  const stats = parsed?.backlinkStats;
  const lead = narratives?.['backlink-overview'] || '';

  if (!hasData) {
    return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">Backlink Audit</h2></div>
<div class="section-kicker">Toxic-link identification, disavow workflow, link-gap intro, recommended outreach angles.</div>

<div class="stats-row">
  <div class="stat-card"><span class="num">—</span><span class="lbl">Total Backlinks</span></div>
  <div class="stat-card"><span class="num">—</span><span class="lbl">Referring Domains</span></div>
  <div class="stat-card stat-card-hero"><span class="num">—</span><span class="lbl">Authority Score</span></div>
</div>

<div class="callout callout-amber">
  <p style="margin:0;"><strong>Pending Semrush backlinks CSV:</strong> upload the export to auto-populate stat cards, toxic-link table, and link-gap analysis.</p>
</div>
</section>`;
  }

  const toxicRows = parsed.clientBacklinks
    .filter((b) => b.isToxic)
    .slice(0, 30)
    .map(
      (b) =>
        `<tr><td>${escapeHtml(b.sourceDomain)}</td><td>${b.sourceAs ?? b.sourceDr ?? 0}</td><td>${escapeHtml(b.toxicReason || '—')}</td><td>Disavow</td></tr>`
    )
    .join('\n      ');
  const toxicCount = stats!.toxicCount;
  const toxicPct = Math.round(stats!.toxicPercent);

  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">Backlink Audit</h2></div>
<div class="section-kicker">${stats!.totalBacklinks.toLocaleString()} backlinks across ${stats!.totalReferringDomains.toLocaleString()} referring domains analyzed.</div>

${lead}

<div class="stats-row">
  <div class="stat-card"><span class="num">${stats!.totalBacklinks.toLocaleString()}</span><span class="lbl">Total Backlinks</span></div>
  <div class="stat-card"><span class="num">${stats!.totalReferringDomains.toLocaleString()}</span><span class="lbl">Referring Domains</span></div>
  <div class="stat-card stat-card-hero"><span class="num">${toxicCount}</span><span class="lbl">Toxic Backlinks (${toxicPct}%)</span></div>
</div>

${
  toxicCount > 0
    ? `<div class="callout callout-red">
  <h4>${toxicPct >= 30 ? 'CRITICAL FINDING' : 'Toxic-link cleanup needed'}: ${toxicCount} backlinks flagged toxic (${toxicPct}% of profile)</h4>
  <p>Backlinks classified by the toxic classifier as: emoji-titled link farms, AS-0 directory dumps, scraper/stats networks, suspicious TLDs, or known spam patterns.</p>
</div>`
    : `<div class="callout callout-green">
  <p style="margin:0;"><strong>Clean backlink profile.</strong> No links flagged as toxic by the heuristic classifier. Continue building only manually-vetted, editorial-quality links.</p>
</div>`
}

${
  toxicCount > 0
    ? `<h3>Toxic-Link Triage (top 30 by score)</h3>
<table>
  <thead><tr><th>Domain</th><th>AS / DR</th><th>Pattern</th><th>Action</th></tr></thead>
  <tbody>
    ${toxicRows}
  </tbody>
</table>`
    : ''
}

<h3>Legitimate Backlink Profile</h3>
<table>
  <thead><tr><th>Domain</th><th>Best Source DR / AS</th></tr></thead>
  <tbody>
    ${
      stats!.legitDomains
        .slice(0, 20)
        .map((d) => `<tr><td>${escapeHtml(d.domain)}</td><td>${d.dr}</td></tr>`)
        .join('\n      ') ||
      '<tr><td colspan="2"><em>No legitimate backlinks identified — strongly recommend a coordinated outreach campaign.</em></td></tr>'
    }
  </tbody>
</table>

<h3>Disavow Workflow</h3>
<table>
  <thead><tr><th>Step</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Generate disavow.txt from the toxic-link rows above (one <code>domain:</code> line per host)</td></tr>
    <tr><td>2</td><td>Submit to Google Search Console → Disavow Tool</td></tr>
    <tr><td>3</td><td>Monitor GSC over 60 days — Google processes in 2–8 weeks</td></tr>
  </tbody>
</table>

<h3>Recommended Link-Building Angles</h3>
<div class="callout callout-green">
  <ol>
    <li><strong>Local partnerships:</strong> Vendor-of-record links from complementary local businesses.</li>
    <li><strong>Industry directories:</strong> Niche, vertical-specific directories with manual moderation.</li>
    <li><strong>Guest posts:</strong> Pitched topics relevant to ${escapeHtml(audit.client.location || 'your service area')}.</li>
    <li><strong>HARO / Connectively:</strong> Editorial DA 60+ links from journalist queries.</li>
    <li><strong>Sponsorships:</strong> Local events, charities, community organizations.</li>
  </ol>
  <p><strong>Benchmark:</strong> 3–5 new clean RDs per month is a sustainable pace.</p>
</div>
</section>`;
}
