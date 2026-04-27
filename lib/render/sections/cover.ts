import { Audit } from '../../types';
import { escapeHtml } from '../template';
import { hostnameOf } from '../../utils';

export function renderCover(audit: Audit, logoSrc: string, reportingMonth: string): string {
  const url = audit.client.url ? hostnameOf(audit.client.url) : '';
  const services = audit.client.services.join(' · ');
  return `
<section class="cover">
  ${logoSrc ? `<div class="logo-card"><img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(audit.client.name)}"></div>` : ''}
  <h1>SEO Audit Report</h1>
  <div class="subtitle">${escapeHtml(audit.client.name)}</div>
  <div class="accent-line"></div>
  <div class="meta">
    ${url ? `<div class="url">${escapeHtml(url)}</div>` : ''}
    ${audit.client.location ? `<div>${escapeHtml(audit.client.location)}${services ? ' &nbsp;|&nbsp; ' + escapeHtml(services) : ''}</div>` : ''}
    <div>Prepared: ${escapeHtml(reportingMonth)}</div>
    <div>Prepared by Makarios Marketing</div>
  </div>
  <div class="confidential">CONFIDENTIAL — PREPARED FOR CLIENT REVIEW</div>
</section>`;
}
