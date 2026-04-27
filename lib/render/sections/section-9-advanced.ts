import { Audit } from '../../types';
import { escapeHtml } from '../template';
import { buildRevenueProjection } from '../../revenue';
import { Narratives } from '../../narratives-cache';

export function renderSection9Advanced(
  audit: Audit,
  num = 9,
  _parsed?: unknown,
  _lighthouse?: unknown,
  narratives?: Narratives
): string {
  void _parsed;
  void _lighthouse;
  const proj = buildRevenueProjection(audit);
  const m12 = proj.scenarios.m12.amountFormatted;
  const m18 = proj.scenarios.m18.amountFormatted;

  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">Advanced SEO &amp; Final Executive Summary</h2></div>
<div class="section-kicker">Pillar &amp; cluster strategy, CRO opportunities, future bets, and the bottom-line revenue recap.</div>

<h3>Pillar &amp; Cluster Strategy</h3>
<p>The fastest path from your current keyword footprint to a defensible position is a pillar-and-cluster content architecture: one comprehensive 3,000+ word pillar page per primary service, supported by 4–6 cluster pages targeting long-tail variants and informational queries.</p>

<h3>Conversion Rate Optimization</h3>
<table>
  <thead><tr><th>CRO Element</th><th>Current</th><th>Recommendation</th></tr></thead>
  <tbody>
    <tr><td>Sticky "Book Now" / contact CTA</td><td>—</td><td>Sticky header CTA visible on scroll, especially mobile.</td></tr>
    <tr><td>Phone click-to-call</td><td>—</td><td>Wrap phone numbers in <code>tel:</code> links across every page.</td></tr>
    <tr><td>Testimonial prominence</td><td>—</td><td>Move above-the-fold on homepage. Pull live Google star rating if possible.</td></tr>
    <tr><td>Trust badges</td><td>—</td><td>Add: insured, certified, payment methods, response time.</td></tr>
    <tr><td>Booking flow</td><td>—</td><td>Reduce friction — inline booking widget vs. redirect.</td></tr>
  </tbody>
</table>

<h3>Future Opportunities</h3>
<ul>
  <li><strong>YouTube SEO:</strong> Short process / explainer videos. YouTube videos rank in Google search and drive referral traffic.</li>
  <li><strong>Google Local Service Ads:</strong> Once GBP has 15+ reviews, apply for Google Guaranteed. Pay-per-lead, very high ROI for local services.</li>
  <li><strong>Email capture:</strong> Lead-magnet PDF → email list for repeat customer nurture (LTV multiplier).</li>
  <li><strong>Seasonal content:</strong> Calendar-aligned posts capturing predictable seasonal demand spikes.</li>
</ul>

<div class="callout callout-dark">
  <h4>Final Executive Summary</h4>
  ${narratives?.['executive-summary'] || `<p>The recommendations across this audit map directly to verified data: SERP analysis, Semrush keyword volumes, the Map Pack matrix, the on-page review, the backlink profile, and (where available) the client's own first-party GSC + GA4 numbers.</p>
  <p>Combined, these recommendations are conservatively worth <strong>${escapeHtml(m12)} in monthly recurring revenue at Month 12</strong> and <strong>${escapeHtml(m18)} at Month 18</strong> once top-3 rankings on the highest-value primary keywords are landed and Map Pack visibility is consolidated.</p>
  <p>The gap between today and that target closes through disciplined, sequential execution of the items inside each section above — not through any single magic intervention.</p>`}
</div>
</section>`;
}
