import Link from 'next/link';
import { Plus } from 'lucide-react';
import { readAuditsIndex } from '@/lib/audits';
import { AuditsList } from './audits-list';

export const dynamic = 'force-dynamic';

export default async function AuditsPage() {
  const audits = await readAuditsIndex();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audits</h1>
          <p className="text-slate-600 mt-1">
            All comprehensive client audits, newest first.
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

      {audits.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-10 text-center">
          <p className="text-slate-600">
            No audits yet.{' '}
            <Link href="/audits/new" className="text-[#0f2746] underline">
              Create the first one
            </Link>
            .
          </p>
        </div>
      ) : (
        <AuditsList initial={audits} />
      )}
    </div>
  );
}
