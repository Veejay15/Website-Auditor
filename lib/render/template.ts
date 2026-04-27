/**
 * Heat City canonical template, parameterized.
 * Returns the document scaffolding (head + styles + close). Each section module
 * contributes its own <section>...</section> body to be inserted in order.
 *
 * Differences from the TikTok-audit canonical:
 *   - No CTA page (paying clients - removed entirely).
 *   - Brand accent color is configurable per audit (defaults to #dc2626).
 *   - Section count expanded from 7 to 9 (Site-Wide Content Audit, Competitor Dashboard,
 *     GSC + GA4 Trend Analysis added).
 */

export interface TemplateOptions {
  clientName: string;
  brandAccentColor: string; // e.g. '#dc2626'
  reportingMonth: string; // e.g. 'April 2026'
}

export function renderHead(opts: TemplateOptions): string {
  const accent = opts.brandAccentColor || '#dc2626';
  const headerLabel = `${opts.clientName.toUpperCase()} — SEO AUDIT`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(opts.clientName)} — SEO Audit</title>
<style>
  @page {
    size: A4;
    margin: 22mm 16mm 20mm 16mm;
    @top-left {
      content: "${escapeCss(headerLabel)}";
      font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 8.5pt; font-weight: 600; color: #9ca3af;
      letter-spacing: 0.08em; padding-top: 10mm;
    }
    @top-right {
      content: "${escapeCss(opts.reportingMonth)}";
      font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 8.5pt; color: #9ca3af; padding-top: 10mm;
    }
    @bottom-center {
      content: "Page " counter(page) "  /  " counter(pages);
      font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 8.5pt; color: #9ca3af; letter-spacing: 0.04em; padding-bottom: 6mm;
    }
  }
  @page cover {
    margin: 0;
    @top-left { content: ""; }
    @top-right { content: ""; }
    @bottom-center { content: ""; }
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #1f2937; font-size: 10.5pt; line-height: 1.6;
  }

  /* Screen-only preview: render each section as a centered paper sheet on a gray backdrop. */
  @media screen {
    body { background: #e5e7eb; padding: 24px 0; }
    .cover, .toc-page, .revenue-page, .section {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto 24px auto;
      background: #ffffff;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      padding: 22mm 16mm 20mm 16mm;
      page-break-after: auto;
    }
    .cover {
      padding: 40mm 30mm;
      background: linear-gradient(180deg, #0f2746 0%, #12244a 100%);
    }
  }

  h1 { font-size: 26pt; font-weight: 800; color: #0f2746; margin: 0 0 14px 0; letter-spacing: -0.01em; }
  h2 { font-size: 18pt; font-weight: 800; color: #0f2746; margin: 0 0 6px 0; letter-spacing: -0.01em; }
  h3 { font-size: 13pt; font-weight: 700; color: #0f2746; margin: 20px 0 8px 0; }
  h4 { font-size: 11pt; font-weight: 700; color: #0f2746; margin: 14px 0 6px 0; }
  p { margin: 8px 0; }
  ul, ol { margin: 8px 0 8px 20px; padding: 0; }
  li { margin: 4px 0; }
  strong { font-weight: 700; color: #0f2746; }
  code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-size: 0.9em; color: ${accent}; }

  .cover {
    page: cover; page-break-after: always;
    width: 210mm; height: 297mm;
    background: linear-gradient(180deg, #0f2746 0%, #12244a 100%);
    color: #ffffff; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
    padding: 40mm 30mm; position: relative;
  }
  .cover::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 6mm; background: ${accent}; }
  .cover .logo-card {
    background: #ffffff; padding: 20px 30px; border-radius: 10px;
    display: inline-block; margin-bottom: 35px; box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  }
  .cover .logo-card img { max-width: 260px; height: auto; display: block; }
  .cover h1 { color: #ffffff; font-size: 40pt; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 14px 0; }
  .cover .subtitle { font-size: 15pt; color: #d1d5db; font-weight: 400; margin-bottom: 28px; }
  .cover .accent-line { width: 80px; height: 3px; background: ${accent}; margin: 0 auto 32px auto; }
  .cover .meta { font-size: 10.5pt; color: #d1d5db; line-height: 1.9; margin-bottom: 40px; }
  .cover .meta .url { color: #ffffff; font-weight: 700; font-size: 12pt; }
  .cover .confidential {
    display: inline-block; padding: 10px 24px; border: 1.5px solid rgba(255,255,255,0.3);
    border-radius: 999px; font-size: 8.5pt; letter-spacing: 0.15em; color: #d1d5db; font-weight: 600;
  }

  .toc-page { page-break-after: always; padding-top: 6mm; }
  .toc-page .logo-container { text-align: center; margin: 20px 0 26px 0; background: #0f2746; padding: 22px; border-radius: 10px; }
  .toc-page .logo-container img { max-width: 280px; height: auto; }
  .toc-page h1 { font-size: 22pt; margin-bottom: 8px; }
  .toc-page .kicker { color: #6b7280; font-size: 9.5pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
  .toc-list { margin: 14px 0 20px 0; padding: 0; list-style: none; }
  .toc-list li {
    padding: 10px 0; border-bottom: 1px solid #e5e7eb; display: flex;
    align-items: center; gap: 14px; font-size: 10.5pt; color: #1f2937;
  }
  .toc-list .num {
    display: inline-block; width: 26px; height: 26px; background: #0f2746;
    color: #fff; border-radius: 50%; text-align: center; line-height: 26px;
    font-size: 9.5pt; font-weight: 700;
  }

  .revenue-page { page-break-before: always; page-break-after: always; padding-top: 4mm; }
  .revenue-page .kicker { color: ${accent}; font-size: 9.5pt; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 4px; }
  .revenue-page h1 { font-size: 28pt; margin: 0 0 6px 0; }
  .revenue-sub { font-size: 12pt; color: #6b7280; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid #0f2746; }
  .revenue-scenarios { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
  .revenue-card { padding: 20px 16px; border-radius: 10px; text-align: center; border-top: 4px solid; }
  .revenue-card .r-label { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
  .revenue-card .r-num { font-size: 28pt; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
  .revenue-card .r-sub { font-size: 9pt; font-weight: 600; color: #6b7280; letter-spacing: 0.04em; margin-top: 4px; }
  .revenue-card .r-detail { font-size: 9pt; color: #4b5563; margin-top: 10px; line-height: 1.4; }
  .revenue-card-low { background: #f9fafb; border-color: #6b7280; }
  .revenue-card-low .r-num { color: #374151; }
  .revenue-card-mid { background: #f0fdf4; border-color: #16a34a; }
  .revenue-card-mid .r-num { color: #15803d; }
  .revenue-card-high { background: #fef2f2; border-color: ${accent}; }
  .revenue-card-high .r-num { color: #b91c1c; }

  .section { page-break-before: always; }
  .section-head { display: flex; align-items: center; gap: 14px; margin-bottom: 4px; }
  .section-num {
    width: 34px; height: 34px; background: #16a34a; color: #fff;
    border-radius: 50%; display: inline-block; text-align: center;
    line-height: 34px; font-size: 12pt; font-weight: 800; flex-shrink: 0;
  }
  .section-title { margin: 0; font-size: 19pt; }
  .section-kicker { color: #6b7280; font-size: 9.5pt; margin: 2px 0 12px 48px; padding-bottom: 10px; border-bottom: 2px solid #0f2746; }

  .callout { border-left: 4px solid; padding: 14px 18px; border-radius: 4px; margin: 16px 0; page-break-inside: avoid; }
  .callout h3, .callout h4 { margin-top: 0; }
  .callout-green { background: #f0fdf4; border-color: #16a34a; }
  .callout-green h3, .callout-green h4 { color: #15803d; }
  .callout-green p, .callout-green li { color: #14532d; }
  .callout-amber { background: #fffbeb; border-color: #d97706; }
  .callout-amber h3, .callout-amber h4 { color: #b45309; }
  .callout-amber p, .callout-amber li { color: #78350f; }
  .callout-red { background: #fef2f2; border-color: ${accent}; }
  .callout-red h3, .callout-red h4 { color: #b91c1c; }
  .callout-red p, .callout-red li { color: #7f1d1d; }
  .callout-dark { background: #0f2746; border-color: ${accent}; color: #e5e7eb; }
  .callout-dark h3, .callout-dark h4 { color: #ffffff; }
  .callout-dark p, .callout-dark li { color: #e5e7eb; }
  .callout-dark strong { color: #ffffff; }
  .callout-gray { background: #f3f4f6; border-color: #6b7280; padding: 16px 20px; }
  .callout-gray h4 { color: #0f2746; margin-top: 0; }

  .critical { color: ${accent}; font-weight: 700; }
  .success { color: #16a34a; font-weight: 700; }
  .your-site { color: ${accent}; font-weight: 700; }

  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 9.5pt; page-break-inside: avoid; }
  th { background: #0f2746; color: #ffffff; font-weight: 700; text-align: left; padding: 10px 10px; border: 1px solid #0f2746; font-size: 9pt; letter-spacing: 0.02em; }
  td { padding: 9px 10px; border: 1px solid #e5e7eb; vertical-align: top; font-size: 9.5pt; }
  tr:nth-child(even) td { background: #f9fafb; }

  .stats-row { display: flex; gap: 12px; margin: 18px 0; }
  .stat-card { flex: 1; background: #f3f4f6; border-radius: 8px; padding: 18px 16px; text-align: center; border-top: 3px solid #e5e7eb; }
  .stat-card .num { font-size: 22pt; font-weight: 800; color: #0f2746; display: block; line-height: 1.1; }
  .stat-card .lbl { font-size: 8.5pt; color: #6b7280; margin-top: 4px; display: block; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
  .stat-card-hero { background: #0f2746; border-top: 3px solid ${accent}; }
  .stat-card-hero .num { color: #ffffff; }
  .stat-card-hero .lbl { color: #d1d5db; }

  .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
  .score-card { text-align: center; padding: 14px 8px; border-radius: 8px; background: #fafafa; border: 1px solid #e5e7eb; }
  .score-card .score { font-size: 26pt; font-weight: 800; line-height: 1; letter-spacing: -0.02em; }
  .score-card .lbl { font-size: 8.5pt; color: #6b7280; margin-top: 8px; display: block; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .score-poor { color: ${accent}; }
  .score-ni { color: #d97706; }
  .score-good { color: #16a34a; }

  .pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.02em; }
  .pill-red { background: #fef2f2; color: #b91c1c; }
  .pill-amber { background: #fffbeb; color: #b45309; }
  .pill-green { background: #f0fdf4; color: #15803d; }
  .pill-gray { background: #f3f4f6; color: #374151; }

  .kd-green { color: #16a34a; font-weight: 800; }
  .kd-amber { color: #d97706; font-weight: 800; }
  .kd-red { color: ${accent}; font-weight: 800; }

  .small { font-size: 9pt; color: #6b7280; }
  .centered { text-align: center; }
  .twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
  .twocol .callout { margin: 0; }

  /* Map Pack Ranking Matrix */
  .mp-matrix { width: 100%; font-size: 9pt; }
  .mp-matrix th, .mp-matrix td { padding: 7px 6px; text-align: center; border: 1px solid #e5e7eb; }
  .mp-matrix th { background: #0f2746; color: #fff; font-size: 8.5pt; }
  .mp-matrix td.q-cell { text-align: left; font-weight: 600; color: #1f2937; min-width: 180px; }
  .mp-matrix td.you-col { background: #f0f9ff !important; border-left: 3px solid #0f2746; }
  .mp-cell-1, .mp-cell-2, .mp-cell-3 { background: #f0fdf4; color: #15803d; font-weight: 800; }
  .mp-cell-top10 { background: #fffbeb; color: #b45309; font-weight: 700; }
  .mp-cell-nr { background: #fef2f2; color: #b91c1c; font-weight: 800; }
  .mp-cell-empty { background: #f3f4f6; color: #9ca3af; }

  /* Competitor Comparison Dashboard */
  .ccd-hero { background: #0f2746; color: #fff; padding: 16px; border-radius: 8px; margin: 12px 0; }
  .ccd-hero strong { color: #fff; }
</style>
</head>
<body>
`;
}

export function renderClose(): string {
  return `</body></html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeCss(s: string): string {
  return s.replace(/"/g, '\\"');
}
