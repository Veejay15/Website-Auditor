import Image from 'next/image';

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6 text-slate-800">
      <div className="flex items-center gap-3">
        <Image src="/makarios-logo.webp" alt="Makarios" width={400} height={107} className="h-10 w-auto" />
        <span className="text-sm font-medium text-slate-500 border-l border-slate-300 pl-3">
          Client Audits — Help
        </span>
      </div>

      <h1 className="text-3xl font-bold text-slate-900">How to build a client audit</h1>

      <ol className="space-y-3 list-decimal pl-6">
        <li>
          <strong>Sign in</strong> with the shared admin password. Sessions last 7 days.
        </li>
        <li>
          Click <strong>+ New Audit</strong> on the dashboard.
        </li>
        <li>
          Walk through the 8-step wizard. Each step autosaves so you can leave and come
          back.
          <ul className="list-disc pl-6 mt-1 text-sm space-y-0.5 text-slate-600">
            <li>Client basics (name, URL, location, services, logo)</li>
            <li>Brand accent color (defaults to red — swap if client brand differs)</li>
            <li>Competitors (3–5 URLs)</li>
            <li>Map Pack queries (10+ local search terms)</li>
            <li>Map Pack matrix (manually mark each cell, OR upload Local Dominator screenshots in Step 6)</li>
            <li>Uploads: Semrush keyword + backlink CSVs, GA4 + GSC CSVs, Local Dominator screenshots</li>
            <li>Revenue inputs (AOV, conversion rate)</li>
            <li>Review &amp; generate</li>
          </ul>
        </li>
        <li>
          Click <strong>Generate audit</strong>. The pipeline runs Lighthouse via PageSpeed
          Insights, parses your CSVs, asks Claude to write the narrative, and assembles
          the comprehensive HTML.
        </li>
        <li>
          When complete, click <strong>Save as PDF</strong>. This opens the audit preview
          in a new tab and triggers your browser&apos;s print dialog — choose &quot;Save
          as PDF&quot; in the destination dropdown for full design fidelity (paged CSS,
          page numbers, the cover gradient, etc.).
        </li>
      </ol>

      <h2 className="text-xl font-semibold text-slate-900 pt-4">Audit structure</h2>
      <p className="text-sm">
        Cover · TOC · Revenue Opportunity · Section 1 SERP Competitive Analysis ·
        Section 2 Keyword Strategy &amp; Gap Analysis · Section 3 Technical SEO ·
        Section 4 Site-Wide Content Audit · Section 5 Local SEO &amp; Map Pack Deep Dive
        (with Map Pack Ranking Matrix) · Section 6 Deep Competitor Comparison Dashboard
        · Section 7 Backlink Audit · Section 8 GSC + GA4 Trend Analysis · Section 9
        Advanced SEO &amp; Final Executive Summary.
      </p>
      <p className="text-sm text-slate-600">
        These are paying-client audits, so there is no Book-a-Call CTA page. The audit
        ends with the Final Executive Summary inside Section 9.
      </p>

      <h2 className="text-xl font-semibold text-slate-900 pt-4">Where things live</h2>
      <ul className="text-sm list-disc pl-6 space-y-1">
        <li><code>data/audits.json</code> — index of all audits</li>
        <li><code>data/audits/&lt;id&gt;/</code> — per-audit input + parsed data + generated HTML</li>
        <li><code>data/settings.json</code> — Makarios brand defaults &amp; revenue assumptions</li>
        <li>Vercel Blob — uploaded logos, CSVs, screenshots, and final PDFs</li>
      </ul>
    </div>
  );
}
