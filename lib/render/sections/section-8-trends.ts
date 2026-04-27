import { Audit } from '../../types';
import { escapeHtml } from '../template';

export function hasGa4OrGscData(audit: Audit): boolean {
  return !!(
    audit.uploads.gscQueriesCsv ||
    audit.uploads.gscPagesCsv ||
    audit.uploads.ga4TrafficCsv ||
    audit.uploads.ga4EventsCsv
  );
}

export function renderSection8Trends(audit: Audit, num = 8): string {
  const hasGsc = !!(audit.uploads.gscQueriesCsv || audit.uploads.gscPagesCsv);
  const hasGa4 = !!(audit.uploads.ga4TrafficCsv || audit.uploads.ga4EventsCsv);

  // The orchestrator should not include this section at all when no GA4/GSC data
  // is present. This guard exists only as a safety net.
  if (!hasGsc && !hasGa4) return '';

  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">GSC + GA4 Trend Analysis</h2></div>
<div class="section-kicker">12-month organic-traffic trend, top pages by movement, channel attribution, conversion events.</div>

<p>This section uses ${escapeHtml(audit.client.name)}'s own first-party data from Google Search Console and Google Analytics 4 to validate the SEO opportunities identified earlier in the audit against actual user behavior.</p>

${
  hasGsc
    ? `
<h3>GSC — Search Performance</h3>
<div class="stats-row">
  <div class="stat-card stat-card-hero"><span class="num">—</span><span class="lbl">Total Clicks (12mo)</span></div>
  <div class="stat-card"><span class="num">—</span><span class="lbl">Total Impressions</span></div>
  <div class="stat-card"><span class="num">—</span><span class="lbl">Avg CTR</span></div>
  <div class="stat-card"><span class="num">—</span><span class="lbl">Avg Position</span></div>
</div>

<h4>Top Queries by Clicks</h4>
<table>
  <thead><tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Position</th></tr></thead>
  <tbody><tr><td colspan="5"><em>Auto-populated from GSC CSV.</em></td></tr></tbody>
</table>
`
    : ''
}

${
  hasGa4
    ? `
<h3>GA4 — Channel Attribution</h3>
<table>
  <thead><tr><th>Channel</th><th>Sessions</th><th>Engagement Rate</th><th>Key Events</th><th>Revenue</th></tr></thead>
  <tbody><tr><td colspan="5"><em>Auto-populated from GA4 CSV.</em></td></tr></tbody>
</table>

<h4>Top Conversion Events</h4>
<table>
  <thead><tr><th>Event</th><th>Count</th><th>Unique Users</th><th>Revenue</th></tr></thead>
  <tbody><tr><td colspan="4"><em>Auto-populated from GA4 events CSV.</em></td></tr></tbody>
</table>
`
    : ''
}

<div class="callout callout-green">
  <h4>Why this matters at the client tier</h4>
  <p>Earlier sections diagnose what's possible (SERP gaps, keyword opportunities, technical issues). This section diagnoses what's actually happening (real users, real conversions). The two perspectives together produce a much sharper prioritization — you fix the technical issue that blocks the page that's actually driving conversions today, before you fix the technical issue on a page that doesn't matter.</p>
</div>
</section>`;
}
