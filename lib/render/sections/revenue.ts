import { Audit } from '../../types';
import { buildRevenueProjection } from '../../revenue';
import { escapeHtml } from '../template';

export function renderRevenue(audit: Audit): string {
  const proj = buildRevenueProjection(audit);
  const { m6, m12, m18 } = proj.scenarios;

  return `
<section class="revenue-page">
  <div class="kicker">COMMERCIAL OPPORTUNITY</div>
  <h1>Revenue Potential</h1>
  <div class="revenue-sub">What top-3 rankings could unlock for ${escapeHtml(audit.client.name)} — monthly, in dollars.</div>

  <p>Before the audit findings, here's the commercial stakes. These projections use Semrush keyword volumes, industry-standard CTRs, the client's published service pricing, and a realistic conversion rate for a local service business with optimized CRO.</p>

  <div class="revenue-scenarios">
    <div class="revenue-card revenue-card-low">
      <div class="r-label">${escapeHtml(m6.label)}</div>
      <div class="r-num">${escapeHtml(m6.amountFormatted)}</div>
      <div class="r-sub">PER MONTH</div>
      <div class="r-detail">${escapeHtml(m6.detail)}</div>
    </div>
    <div class="revenue-card revenue-card-mid">
      <div class="r-label">${escapeHtml(m12.label)}</div>
      <div class="r-num">${escapeHtml(m12.amountFormatted)}</div>
      <div class="r-sub">PER MONTH</div>
      <div class="r-detail">${escapeHtml(m12.detail)}</div>
    </div>
    <div class="revenue-card revenue-card-high">
      <div class="r-label">${escapeHtml(m18.label)}</div>
      <div class="r-num">${escapeHtml(m18.amountFormatted)}</div>
      <div class="r-sub">PER MONTH</div>
      <div class="r-detail">${escapeHtml(m18.detail)}</div>
    </div>
  </div>

  <h3>How These Numbers Are Calculated</h3>
  <table>
    <thead><tr><th>Factor</th><th>Assumption</th><th>Source</th></tr></thead>
    <tbody>
      ${proj.methodology
        .map(
          (m) =>
            `<tr><td>${escapeHtml(m.factor)}</td><td>${escapeHtml(m.assumption)}</td><td>${escapeHtml(m.source)}</td></tr>`
        )
        .join('\n      ')}
    </tbody>
  </table>

  <h3>Month 12 Revenue Math (Realistic Scenario)</h3>
  <table>
    <thead><tr><th>Traffic Source</th><th>Volume / CTR</th><th>Monthly Clicks</th><th>Customers</th><th>Monthly Revenue</th></tr></thead>
    <tbody>
      ${proj.m12Math.rows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.source)}</td><td>${escapeHtml(r.volumeOrCtr)}</td><td>${r.clicks}</td><td>${escapeHtml(r.customers)}</td><td>${escapeHtml(r.revenue)}</td></tr>`
        )
        .join('\n      ')}
      <tr><td><strong>TOTAL (monthly)</strong></td><td></td><td><strong>~${proj.m12Math.totals.clicks}</strong></td><td><strong>${escapeHtml(proj.m12Math.totals.customersRange)}</strong></td><td><strong>${escapeHtml(proj.m12Math.totals.revenueRange)}</strong></td></tr>
    </tbody>
  </table>

  <div class="callout callout-dark">
    <h4>What These Numbers Don't Include</h4>
    <ul>
      <li><strong>Repeat business:</strong> 12-month customer LTV is typically 1.5–2× first booking for local service businesses.</li>
      <li><strong>Referrals:</strong> Word-of-mouth from satisfied customers in HOA / neighborhood markets.</li>
      <li><strong>Service upsells:</strong> Every entry-level customer is a future high-ticket service lead.</li>
      <li><strong>Google LSA (Local Service Ads):</strong> Once GBP hits 15+ reviews, often 2× lead volume.</li>
    </ul>
    <p style="margin-top:10px;"><strong>Practical sustained total including LTV + referrals + LSA:</strong> <span style="color:#fca5a5;">${escapeHtml(proj.sustainedRange)} / month</span> within 18 months of disciplined SEO execution.</p>
  </div>

  <p class="small" style="margin-top:12px;">Note: These projections assume execution of the on-page fixes, schema deployment, GBP optimization, review acquisition, and link cleanup detailed in the sections that follow.</p>
</section>`;
}
