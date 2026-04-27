import { Audit, MapPackPosition } from '../types';
import { escapeHtml } from './template';
import { hostnameOf } from '../utils';

function cellClassFor(value: MapPackPosition): string {
  if (value === 1 || value === 2 || value === 3) return `mp-cell-${value}`;
  if (value === 'top10') return 'mp-cell-top10';
  if (value === 'nr') return 'mp-cell-nr';
  return 'mp-cell-empty';
}

function cellTextFor(value: MapPackPosition): string {
  if (value === null || value === undefined) return '—';
  if (value === 'top10') return '4–10';
  if (value === 'nr') return 'NR';
  return String(value);
}

interface SummaryStats {
  client: number;
  byCompetitor: Record<string, number>;
  totalRows: number;
}

function topThreeWins(value: MapPackPosition): boolean {
  return value === 1 || value === 2 || value === 3;
}

function buildSummary(audit: Audit): SummaryStats {
  let client = 0;
  const byCompetitor: Record<string, number> = {};
  for (const c of audit.competitors) byCompetitor[c.url] = 0;
  for (const q of audit.mapPackQueries) {
    const row = audit.mapPackResults[q.query];
    if (!row) continue;
    if (topThreeWins(row.client)) client += 1;
    for (const c of audit.competitors) {
      if (topThreeWins(row[c.url] as MapPackPosition)) byCompetitor[c.url] += 1;
    }
  }
  return { client, byCompetitor, totalRows: audit.mapPackQueries.length };
}

export function renderMapPackMatrix(audit: Audit): string {
  if (audit.mapPackQueries.length === 0) {
    return `
<div class="callout callout-amber">
  <h4>Map Pack Ranking Matrix — pending</h4>
  <p>No Map Pack queries have been added to this audit. Add 10+ local search queries in the wizard, then mark each cell with the client and competitor positions to populate this heat-map grid.</p>
</div>`;
  }

  const summary = buildSummary(audit);
  const headerCells = audit.competitors
    .map((c) => `<th>${escapeHtml(c.label || hostnameOf(c.url))}</th>`)
    .join('');

  const rows = audit.mapPackQueries
    .map((q) => {
      const row = audit.mapPackResults[q.query] || ({} as Record<string, MapPackPosition>);
      const youCell = row.client as MapPackPosition;
      const compCells = audit.competitors
        .map((c) => {
          const v = row[c.url] as MapPackPosition;
          return `<td class="${cellClassFor(v)}">${cellTextFor(v)}</td>`;
        })
        .join('');
      return `
    <tr>
      <td class="q-cell">${escapeHtml(q.query)}</td>
      <td class="you-col ${cellClassFor(youCell)}">${cellTextFor(youCell)}</td>
      ${compCells}
    </tr>`;
    })
    .join('');

  const summaryCells = audit.competitors
    .map((c) => `<td>${summary.byCompetitor[c.url] ?? 0}/${summary.totalRows}</td>`)
    .join('');

  const topCompetitor = audit.competitors
    .map((c) => ({ label: c.label || hostnameOf(c.url), wins: summary.byCompetitor[c.url] || 0 }))
    .sort((a, b) => b.wins - a.wins)[0];

  return `
<table class="mp-matrix">
  <thead>
    <tr>
      <th class="q-cell">LOCAL SEARCH QUERY</th>
      <th>YOU</th>
      ${headerCells}
    </tr>
  </thead>
  <tbody>${rows}
    <tr>
      <td class="q-cell" style="background:#0f2746; color:#fff;">TOP-3 WINS</td>
      <td class="you-col" style="font-weight:800;">${summary.client}/${summary.totalRows}</td>
      ${summaryCells}
    </tr>
  </tbody>
</table>

<div class="callout callout-${summary.client >= (topCompetitor?.wins ?? 0) ? 'green' : 'red'}">
  <p style="margin:0;">
    <strong>${escapeHtml(audit.client.name)}</strong> holds top-3 in
    <strong>${summary.client} of ${summary.totalRows}</strong> tested local searches.
    ${
      topCompetitor && topCompetitor.wins > summary.client
        ? `<strong>${escapeHtml(topCompetitor.label)}</strong> holds top-3 in <strong>${topCompetitor.wins} of ${summary.totalRows}</strong> — this is the largest local search visibility gap to close.`
        : 'You currently lead the Map Pack across the tested queries — focus on defending and extending into adjacent geographies.'
    }
  </p>
</div>`;
}
