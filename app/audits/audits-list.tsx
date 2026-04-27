'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Audit } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface Props {
  initial: Audit[];
}

export function AuditsList({ initial }: Props) {
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/audits/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to delete audit.');
        setDeletingId(null);
        return;
      }
      setAudits((prev) => prev.filter((a) => a.id !== id));
      setConfirmId(null);
      router.refresh();
    } catch (err) {
      alert(`Failed to delete: ${(err as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ul className="space-y-2">
      {audits.map((a) => {
        const isConfirming = confirmId === a.id;
        const isDeleting = deletingId === a.id;
        return (
          <li
            key={a.id}
            className="bg-white rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
          >
            <div className="flex justify-between items-center gap-4 p-4">
              <Link href={`/audits/${a.id}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900 group-hover:text-[#0f2746] truncate">
                    {a.client.name || 'Untitled audit'}
                  </h3>
                  <StatusPill status={a.status} />
                </div>
                <p className="text-sm text-slate-500 mt-0.5 truncate">
                  {a.client.url} · {a.client.location || 'No location'} ·{' '}
                  {formatDateTime(a.updatedAt)}
                </p>
              </Link>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link
                  href={`/audits/${a.id}`}
                  className="text-xs bg-[#0f2746] text-white px-2.5 py-1 rounded-md hover:bg-[#12244a]"
                >
                  Open
                </Link>
                <button
                  onClick={() => setConfirmId(isConfirming ? null : a.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                  title="Delete audit"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {isConfirming ? (
              <div className="bg-red-50 border-t border-red-200 px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-sm text-red-900">Delete this audit permanently?</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={isDeleting}
                    className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm delete'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
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
