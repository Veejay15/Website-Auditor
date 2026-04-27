import { readSettings } from '@/lib/settings';
import { NewAuditWizard } from './new-audit-wizard';

export const dynamic = 'force-dynamic';

export default async function NewAuditPage() {
  const settings = readSettings();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">New Audit</h1>
        <p className="text-slate-600 mt-1">
          Build a comprehensive client SEO audit. Each step autosaves a draft so you can
          come back later.
        </p>
      </header>
      <NewAuditWizard settings={settings} />
    </div>
  );
}
