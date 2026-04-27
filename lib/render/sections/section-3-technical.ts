import { Audit } from '../../types';
import { LighthouseResult } from '../../lighthouse';
import { Narratives } from '../../narratives-cache';
import { escapeHtml } from '../template';
import { hostnameOf } from '../../utils';

function scoreClass(score: number): string {
  if (score >= 90) return 'score-good';
  if (score >= 50) return 'score-ni';
  return 'score-poor';
}

function statusFor(value: number, threshold: number): string {
  return value <= threshold
    ? '<span class="success">PASS</span>'
    : '<span class="critical">FAIL</span>';
}

function renderScores(label: string, lh: LighthouseResult | undefined): string {
  if (!lh || lh.error) {
    return `
<h4>${escapeHtml(label)} Lighthouse Scores</h4>
<div class="score-grid">
  <div class="score-card"><span class="score score-poor">—</span><span class="lbl">Performance</span></div>
  <div class="score-card"><span class="score score-good">—</span><span class="lbl">SEO</span></div>
  <div class="score-card"><span class="score score-good">—</span><span class="lbl">Accessibility</span></div>
  <div class="score-card"><span class="score score-ni">—</span><span class="lbl">Best Practices</span></div>
</div>${lh?.error ? `<p class="small">PSI error: ${escapeHtml(lh.error)}</p>` : ''}`;
  }
  return `
<h4>${escapeHtml(label)} Lighthouse Scores</h4>
<div class="score-grid">
  <div class="score-card"><span class="score ${scoreClass(lh.scores.performance)}">${lh.scores.performance}</span><span class="lbl">Performance</span></div>
  <div class="score-card"><span class="score ${scoreClass(lh.scores.seo)}">${lh.scores.seo}</span><span class="lbl">SEO</span></div>
  <div class="score-card"><span class="score ${scoreClass(lh.scores.accessibility)}">${lh.scores.accessibility}</span><span class="lbl">Accessibility</span></div>
  <div class="score-card"><span class="score ${scoreClass(lh.scores.bestPractices)}">${lh.scores.bestPractices}</span><span class="lbl">Best Practices</span></div>
</div>`;
}

export interface TechnicalSectionData {
  mobile?: LighthouseResult;
  desktop?: LighthouseResult;
}

export function renderSection3Technical(
  audit: Audit,
  num = 3,
  _parsed?: unknown,
  lh?: TechnicalSectionData,
  narratives?: Narratives
): string {
  void _parsed;
  const m = lh?.mobile;
  const d = lh?.desktop;
  const hasData = (m && !m.error) || (d && !d.error);

  const cwvRows = m && d
    ? `
    <tr><td><strong>Largest Contentful Paint (LCP)</strong></td><td>${escapeHtml(m.metrics.lcp.display)}</td><td>${escapeHtml(d.metrics.lcp.display)}</td><td>&lt; 2.5 s</td><td>${statusFor(m.metrics.lcp.value, 2500)} mobile</td></tr>
    <tr><td><strong>First Contentful Paint (FCP)</strong></td><td>${escapeHtml(m.metrics.fcp.display)}</td><td>${escapeHtml(d.metrics.fcp.display)}</td><td>&lt; 1.8 s</td><td>${statusFor(m.metrics.fcp.value, 1800)} mobile</td></tr>
    <tr><td><strong>Total Blocking Time (TBT)</strong></td><td>${escapeHtml(m.metrics.tbt.display)}</td><td>${escapeHtml(d.metrics.tbt.display)}</td><td>&lt; 200 ms</td><td>${statusFor(m.metrics.tbt.value, 200)} mobile</td></tr>
    <tr><td><strong>Cumulative Layout Shift (CLS)</strong></td><td>${escapeHtml(m.metrics.cls.display)}</td><td>${escapeHtml(d.metrics.cls.display)}</td><td>&lt; 0.1</td><td>${statusFor(m.metrics.cls.value, 0.1)} mobile</td></tr>
    <tr><td><strong>Speed Index</strong></td><td>${escapeHtml(m.metrics.speedIndex.display)}</td><td>${escapeHtml(d.metrics.speedIndex.display)}</td><td>&lt; 3.4 s</td><td>${statusFor(m.metrics.speedIndex.value, 3400)} mobile</td></tr>`
    : '<tr><td colspan="5"><em>Lighthouse / PSI data not yet fetched.</em></td></tr>';

  const oppRows = m?.opportunities && m.opportunities.length > 0
    ? m.opportunities
        .map(
          (o) =>
            `<tr><td>${escapeHtml(o.title)}</td><td>~${(o.savingsMs / 1000).toFixed(2)} s</td><td><em>${escapeHtml(o.description?.slice(0, 200) || 'See PSI report for full guidance.')}</em></td></tr>`
        )
        .join('\n      ')
    : '<tr><td colspan="3"><em>Awaiting PSI run.</em></td></tr>';

  const failedRows = m?.failedAudits && m.failedAudits.length > 0
    ? m.failedAudits
        .slice(0, 12)
        .map(
          (f) =>
            `<tr><td>${escapeHtml(f.title)}</td><td><span class="pill pill-${f.category === 'seo' ? 'red' : 'amber'}">${f.category}</span></td><td>—</td></tr>`
        )
        .join('\n      ')
    : '<tr><td colspan="3"><em>—</em></td></tr>';

  const lcpCritical = m && m.metrics.lcp.value > 4000;

  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">Technical SEO</h2></div>
<div class="section-kicker">PageSpeed Insights audit + on-page review for ${escapeHtml(audit.client.url ? hostnameOf(audit.client.url) : audit.client.name)}.</div>

${narratives?.['technical-overview'] || ''}

<h3>Core Web Vitals &amp; Performance</h3>

${renderScores('Mobile', m)}
${renderScores('Desktop', d)}

<h4>Core Web Vitals — Actual Measurements</h4>
<table>
  <thead><tr><th>Metric</th><th>Mobile</th><th>Desktop</th><th>Threshold</th><th>Status</th></tr></thead>
  <tbody>${cwvRows}
  </tbody>
</table>

${
  lcpCritical
    ? `<div class="callout callout-red">
  <h4>CRITICAL: Mobile LCP is ${escapeHtml(m!.metrics.lcp.display)}</h4>
  <p>Google's threshold is 2.5s. ~70% of potential customers are on mobile, and most will abandon before the page loads. This is the highest-impact issue on the entire site.</p>
</div>`
    : hasData
    ? ''
    : `<div class="callout callout-amber">
  <h4>Pending PageSpeed Insights run</h4>
  <p>Set <code>PAGESPEED_API_KEY</code> in environment vars and run the audit-generation pipeline. PSI is free (25K queries/day with a key) and replaces the legacy Lighthouse local-CLI workflow.</p>
</div>`
}

<h4>Top Performance Opportunities (Mobile)</h4>
<table>
  <thead><tr><th>Opportunity</th><th>Potential Savings</th><th>What To Do</th></tr></thead>
  <tbody>
    ${oppRows}
  </tbody>
</table>

<h3>Failed Audits (SEO &amp; Best Practices)</h3>
<table>
  <thead><tr><th>Audit</th><th>Category</th><th>Notes</th></tr></thead>
  <tbody>
    ${failedRows}
  </tbody>
</table>

<h3>On-Page SEO Issues</h3>
<table>
  <thead><tr><th>Element</th><th>Current State</th><th>Issue</th><th>Priority</th></tr></thead>
  <tbody>
    <tr><td colspan="4"><em>Auto-populated by the WebFetch + raw HTML parser (Phase 3 v3): title, meta description, H1, canonical, schema, image alt %.</em></td></tr>
  </tbody>
</table>

<h3>Site Architecture &amp; Indexation</h3>
<table>
  <thead><tr><th>Element</th><th>Status</th><th>Recommendation</th></tr></thead>
  <tbody>
    <tr><td>robots.txt</td><td>—</td><td>Pending fetch.</td></tr>
    <tr><td>sitemap.xml</td><td>—</td><td>Pending fetch.</td></tr>
    <tr><td>HTTPS</td><td>—</td><td>Pending check.</td></tr>
    <tr><td>Canonical Tags</td><td>—</td><td>Pending check.</td></tr>
  </tbody>
</table>
</section>`;
}
