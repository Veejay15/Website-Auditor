import { Audit } from '../../types';
import { Narratives } from '../../narratives-cache';

export function renderSection4Content(
  audit: Audit,
  num = 4,
  _parsed?: unknown,
  _lighthouse?: unknown,
  narratives?: Narratives
): string {
  void audit;
  void _parsed;
  void _lighthouse;
  const lead = narratives?.['content-audit-overview'] || `<p>For a client-tier audit we go beyond the homepage and service pages and audit the full site — sourced from the sitemap.xml — to surface content gaps and structural problems that no SERP-level analysis can catch.</p>`;
  return `
<section class="section">
<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">Site-Wide Content Audit</h2></div>
<div class="section-kicker">Page inventory, thin-content flags, duplicate titles, orphan pages, internal-link distribution.</div>

${lead}

<h3>Page Inventory</h3>
<table>
  <thead><tr><th>URL</th><th>Title</th><th>Word Count</th><th>H1</th><th>Schema</th><th>Internal Links In</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td colspan="7"><em>Auto-populated from sitemap.xml + per-page WebFetch crawl.</em></td></tr>
  </tbody>
</table>

<h3>Thin Content Flags</h3>
<p><em>Pages under 300 words flagged here automatically.</em></p>

<h3>Duplicate / Near-Duplicate Titles</h3>
<p><em>Titles shared across 2+ pages — often a sign of templated service-area pages without per-page customization.</em></p>

<h3>Orphan Pages</h3>
<p><em>Pages indexed in the sitemap but linked from zero internal pages — Google deprioritizes these.</em></p>

<h3>Internal Link Distribution</h3>
<p><em>Histogram of "links pointing in" per page — identifies hub pages and pages starved of authority flow.</em></p>

<div class="callout callout-green">
  <h4>Why a content audit matters at the client tier</h4>
  <p>Every site develops content drift. Old pages stop being updated, services get retired but the page lingers, blog posts compound and start cannibalizing each other. The goal of this section is to give you a precise list of: pages to update, pages to consolidate, and pages to redirect or remove.</p>
</div>
</section>`;
}
