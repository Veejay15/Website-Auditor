import { Audit } from '../../types';
import { Narratives } from '../../narratives-cache';
import { renderMapPackMatrix } from '../map-pack-matrix';

export function renderSection5Local(
  audit: Audit,
  num = 5,
  _parsed?: unknown,
  _lighthouse?: unknown,
  narratives?: Narratives
): string {
  void _parsed;
  void _lighthouse;
  const lead = narratives?.['local-seo-overview'] || `<p>For a business in your category, <strong>local SEO is the highest-leverage acquisition channel</strong>. Google Business Profile, Map Pack rankings, citation consistency, and review velocity drive the majority of bookings — not blue-link organic.</p>`;
  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">Local SEO &amp; Map Pack Deep Dive</h2></div>
<div class="section-kicker">Your primary lead-generation channel — 80–90% of acquisition for a local service business comes from here.</div>

${lead}

<h3>Map Pack Ranking Matrix</h3>
<p>Position-by-position heat map across ${audit.mapPackQueries.length} local search queries. Green = top-3, amber = positions 4–10, red = not ranking. Your column is highlighted with a navy left border.</p>

${renderMapPackMatrix(audit)}

<h3>Google Business Profile Assessment</h3>
<div class="callout callout-amber">
  <h4>GBP Action Checklist</h4>
  <ul>
    <li><strong>Claim &amp; Verify</strong> the listing if not already done.</li>
    <li><strong>Service Area Business setup</strong> — list every city/neighborhood you cover.</li>
    <li><strong>Primary + secondary categories</strong> aligned with your highest-volume search terms.</li>
    <li><strong>Business description</strong> leads with the primary keyword phrase.</li>
    <li><strong>Photos:</strong> 20+ before/after / facility / team images. The single most under-used GBP ranking factor.</li>
    <li><strong>Services</strong> populated with prices.</li>
    <li><strong>Booking attribute</strong> enabled.</li>
  </ul>
</div>

<h3>Citation Consistency (NAP)</h3>
<table>
  <thead><tr><th>Directory</th><th>Importance</th><th>Status</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td>Google Business Profile</td><td><span class="pill pill-red">Critical</span></td><td>—</td><td>Must be verified + fully populated.</td></tr>
    <tr><td>Yelp</td><td><span class="pill pill-red">Critical</span></td><td>—</td><td>NAP must match GBP exactly.</td></tr>
    <tr><td>Bing Places</td><td><span class="pill pill-amber">High</span></td><td>—</td><td>Free; feeds DuckDuckGo, Yahoo, Siri.</td></tr>
    <tr><td>Apple Maps</td><td><span class="pill pill-amber">High</span></td><td>—</td><td>iPhone "near me" searches.</td></tr>
    <tr><td>Nextdoor Business</td><td><span class="pill pill-amber">High</span></td><td>—</td><td>Neighborhood referrals.</td></tr>
    <tr><td>Facebook Business Page</td><td>Medium</td><td>—</td><td>NAP must match.</td></tr>
    <tr><td>Local Chamber of Commerce</td><td>Medium</td><td>—</td><td>.org link + partnerships.</td></tr>
  </tbody>
</table>

<h3>Review Strategy</h3>
<ul>
  <li><strong>Target:</strong> 25+ Google reviews in 90 days</li>
  <li><strong>Process:</strong> SMS review request 2 hours post-service</li>
  <li><strong>Short link:</strong> g.page/r/... (available once GBP is verified)</li>
  <li><strong>Respond to every review</strong> — Google weights response rate</li>
  <li><strong>Keyword injection in responses</strong> — boosts GBP for those phrases</li>
</ul>
</section>`;
}
