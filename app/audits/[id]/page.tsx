import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readAudit } from '@/lib/audits';
import { formatDateTime, hostnameOf } from '@/lib/utils';
import { AuditActions } from './audit-actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AuditDetailPage({ params }: Props) {
  const { id } = await params;
  const audit = await readAudit(id);
  if (!audit) notFound();

  const competitorCount = audit.competitors.length;
  const queryCount = audit.mapPackQueries.length;
  const filledCells =
    Object.values(audit.mapPackResults).reduce((acc, row) => {
      return acc + Object.values(row).filter((v) => v !== null && v !== undefined).length;
    }, 0);
  const totalCells = queryCount * (competitorCount + 1);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Audit
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            {audit.client.name || 'Untitled audit'}
          </h1>
          <p className="text-slate-600 mt-1">
            {audit.client.url} · {audit.client.location || 'No location set'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Last updated {formatDateTime(audit.updatedAt)}
          </p>
        </div>
        <AuditActions audit={audit} />
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Competitors" value={competitorCount} />
        <Stat label="Map Pack queries" value={queryCount} />
        <Stat
          label="Matrix filled"
          value={`${filledCells}/${totalCells || '—'}`}
        />
        <Stat label="Status" value={audit.status} />
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Competitors</h2>
        {audit.competitors.length === 0 ? (
          <p className="text-sm text-slate-500">No competitors added yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {audit.competitors.map((c, i) => (
              <li key={i} className="text-sm text-slate-700">
                <span className="font-medium">{c.label || hostnameOf(c.url)}</span>{' '}
                <span className="text-slate-500">— {c.url}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Uploads</h2>
        <ul className="text-sm text-slate-700 space-y-1">
          <UploadRow label="Client keyword positions CSV" ref={audit.uploads.keywordsClientCsv} />
          <UploadRow
            label="Competitor keyword CSVs"
            ref={
              audit.uploads.keywordsCompetitorCsvs?.length
                ? { url: '', pathname: `${audit.uploads.keywordsCompetitorCsvs.length} files`, size: 0, uploadedAt: '' }
                : undefined
            }
          />
          <UploadRow label="Backlinks CSV" ref={audit.uploads.backlinksCsv} />
          <UploadRow
            label="Local Dominator screenshots"
            ref={
              audit.uploads.localDominatorScreenshots?.length
                ? { url: '', pathname: `${audit.uploads.localDominatorScreenshots.length} files`, size: 0, uploadedAt: '' }
                : undefined
            }
          />
          <UploadRow label="GA4 traffic CSV" ref={audit.uploads.ga4TrafficCsv} />
          <UploadRow label="GA4 events CSV" ref={audit.uploads.ga4EventsCsv} />
          <UploadRow label="GSC queries CSV" ref={audit.uploads.gscQueriesCsv} />
          <UploadRow label="GSC pages CSV" ref={audit.uploads.gscPagesCsv} />
        </ul>
      </section>

      <div className="flex items-center gap-3">
        <Link
          href={`/audits/${audit.id}/edit`}
          className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 text-sm font-medium"
        >
          Edit audit inputs
        </Link>
        {audit.status === 'complete' ? (
          <Link
            href={`/audits/${audit.id}/preview`}
            className="inline-flex items-center gap-2 bg-[#0f2746] text-white px-4 py-2 rounded-md hover:bg-[#12244a] text-sm font-medium"
          >
            Open preview
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-xl font-bold text-slate-900 mt-1 capitalize">{value}</div>
    </div>
  );
}

function UploadRow({
  label,
  ref,
}: {
  label: string;
  ref?: { url: string; pathname: string; size: number; uploadedAt: string } | null;
}) {
  return (
    <li className="flex items-center justify-between border-b border-slate-100 last:border-0 py-1.5">
      <span className="text-slate-600">{label}</span>
      {ref ? (
        <span className="text-xs text-green-700">{ref.pathname}</span>
      ) : (
        <span className="text-xs text-slate-400">— not uploaded</span>
      )}
    </li>
  );
}
