'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, RefreshCw, Eye, Printer } from 'lucide-react';
import { Audit } from '@/lib/types';

interface Props {
  audit: Audit;
}

export function AuditActions({ audit }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleGenerate() {
    setRunning(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}/generate`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to start generation');
        setRunning(false);
        return;
      }
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const canPrint = audit.status === 'complete';

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/audits/${audit.id}/preview`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-md hover:bg-slate-50 text-sm font-medium"
      >
        <Eye size={14} />
        Preview
      </a>
      <button
        onClick={handleGenerate}
        disabled={running}
        className="inline-flex items-center gap-2 bg-[#0f2746] text-white px-3 py-2 rounded-md hover:bg-[#12244a] disabled:opacity-50 text-sm font-medium"
      >
        {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
        {audit.status === 'complete' ? 'Regenerate' : 'Generate audit'}
      </button>
      {canPrint ? (
        <a
          href={`/audits/${audit.id}/preview?print=1`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-[#16a34a] text-white px-3 py-2 rounded-md hover:bg-[#15803d] text-sm font-medium"
        >
          <Printer size={14} />
          Save as PDF
        </a>
      ) : null}
    </div>
  );
}
