import Link from 'next/link';
import { Plus, FileText, CheckCircle2, Clock } from 'lucide-react';
import { readAuditsIndex, statsByMonth } from '@/lib/audits';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const audits = readAuditsIndex();
  const { thisMonth, total } = statsByMonth(audits);
  const completed = audits.filter((a) => a.status === 'complete').length;
  const inProgress = audits.filter(
    (a) => a.status === 'queued' || a.status === 'running' || a.status === 'rendering'
  ).length;
  const recent = audits.slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Comprehensive client SEO audits for Makarios Marketing.
          </p>
        </div>
        <Link
          href="/audits/new"
          className="inline-flex items-center gap-2 bg-[#0f2746] text-white px-4 py-2 rounded-md hover:bg-[#12244a] text-sm font-medium"
        >
          <Plus size={16} />
          New Audit
        </Link>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Audits this month" value={thisMonth} icon={<FileText size={18} />} />
        <StatCard label="Completed" value={completed} icon={<CheckCircle2 size={18} />} accent="green" />
        <StatCard label="In progress" value={inProgress} icon={<Clock size={18} />} accent="amber" />
        <StatCard label="All-time" value={total} icon={<FileText size={18} />} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent audits</h2>
          {audits.length > 0 && (
            <Link href="/audits" className="text-sm text-[#0f2746] hover:underline">
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-10 text-center">
            <h3 className="text-base font-semibold text-slate-900">No audits yet</h3>
            <p className="text-slate-600 mt-1 mb-4 text-sm">
              Start by creating your first comprehensive client audit.
            </p>
            <Link
              href="/audits/new"
              className="inline-flex items-center gap-2 bg-[#0f2746] text-white px-4 py-2 rounded-md hover:bg-[#12244a] text-sm font-medium"
            >
              <Plus size={16} />
              Create first audit
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((a) => (
              <li
                key={a.id}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
              >
                <Link href={`/audits/${a.id}`} className="block p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {a.client.name || 'Untitled audit'}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        {a.client.url} · {a.client.location || 'No location set'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusPill status={a.status} />
                      <span className="text-xs text-slate-500">
                        {formatDateTime(a.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'green' | 'amber';
}) {
  const accentColor =
    accent === 'green'
      ? 'text-green-700 bg-green-50'
      : accent === 'amber'
      ? 'text-amber-700 bg-amber-50'
      : 'text-slate-700 bg-slate-100';
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">
          {label}
        </div>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-2">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700' },
    queued: { label: 'Queued', cls: 'bg-blue-50 text-blue-700' },
    running: { label: 'Running', cls: 'bg-blue-50 text-blue-700' },
    rendering: { label: 'Rendering', cls: 'bg-blue-50 text-blue-700' },
    complete: { label: 'Complete', cls: 'bg-green-50 text-green-700' },
    failed: { label: 'Failed', cls: 'bg-red-50 text-red-700' },
  };
  const cfg = map[status] || map.draft;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
