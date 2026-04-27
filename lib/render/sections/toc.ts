import { Audit } from '../../types';
import { escapeHtml } from '../template';

export interface TocEntry {
  num: number;
  title: string;
}

export function renderToc(audit: Audit, logoSrc: string, entries: TocEntry[]): string {
  const services = audit.client.services.length > 0 ? audit.client.services.join(' · ') : '';
  const competitorCount = audit.competitors.length;
  const queryCount = audit.mapPackQueries.length;

  return `
<section class="toc-page">
  <div class="kicker">COMPREHENSIVE CLIENT AUDIT</div>
  <h1>${escapeHtml(audit.client.name)}</h1>
  ${logoSrc ? `<div class="logo-container"><img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(audit.client.name)}"></div>` : ''}
  <h2>Report Contents</h2>
  <ul class="toc-list">
    ${entries.map((s) => `<li><span class="num">${s.num}</span> ${escapeHtml(s.title)}</li>`).join('\n    ')}
  </ul>
  <div class="twocol">
    <div class="callout callout-amber">
      <h4>Current Snapshot</h4>
      <ul style="margin-top:6px;">
        ${audit.client.location ? `<li>Location: <strong>${escapeHtml(audit.client.location)}</strong></li>` : ''}
        ${services ? `<li>Services: <strong>${escapeHtml(services)}</strong></li>` : ''}
        <li>Competitors analyzed: <strong>${competitorCount}</strong></li>
        <li>Map Pack queries tracked: <strong>${queryCount}</strong></li>
      </ul>
    </div>
    <div class="callout callout-green">
      <h4>Your Opportunity</h4>
      <p style="margin:0;">This audit isolates the highest-leverage SEO actions across nine analytical pillars — from SERP positioning to backlink quality to GA4 conversion attribution — and quantifies each in revenue terms on the next page.</p>
    </div>
  </div>
</section>`;
}
