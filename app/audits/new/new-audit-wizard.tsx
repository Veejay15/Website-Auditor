'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check, Plus, X, Image as ImageIcon, Upload } from 'lucide-react';
import { AppSettings, Audit, Competitor, MapPackQuery, MapPackResults, MapPackPosition } from '@/lib/types';
import { hostnameOf } from '@/lib/utils';

interface Props {
  settings: AppSettings;
}

const STEPS = [
  { id: 1, label: 'Client basics' },
  { id: 2, label: 'Brand color' },
  { id: 3, label: 'Competitors' },
  { id: 4, label: 'Map Pack queries' },
  { id: 5, label: 'Map Pack matrix' },
  { id: 6, label: 'Semrush + GA4 + GSC uploads' },
  { id: 7, label: 'Revenue inputs' },
  { id: 8, label: 'Review & generate' },
] as const;

export function NewAuditWizard({ settings }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);

  // Step 1
  const [clientName, setClientName] = useState('');
  const [clientUrl, setClientUrl] = useState('');
  const [clientLocation, setClientLocation] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Step 2
  const [brandAccentColor, setBrandAccentColor] = useState('#dc2626');

  // Step 3
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [competitorLabel, setCompetitorLabel] = useState('');

  // Step 4
  const [mapPackQueries, setMapPackQueries] = useState<MapPackQuery[]>([]);
  const [queryInput, setQueryInput] = useState('');

  // Step 5 (Map Pack matrix)
  const [mapPackResults, setMapPackResults] = useState<MapPackResults>({});

  // Step 6 (uploads tracked client-side; actual upload happens on Save)
  const [keywordsClientCsv, setKeywordsClientCsv] = useState<File | null>(null);
  const [keywordsCompetitorCsvs, setKeywordsCompetitorCsvs] = useState<File[]>([]);
  const [backlinksCsv, setBacklinksCsv] = useState<File | null>(null);
  const [localDominatorScreenshots, setLocalDominatorScreenshots] = useState<File[]>([]);
  const [ga4TrafficCsv, setGa4TrafficCsv] = useState<File | null>(null);
  const [ga4EventsCsv, setGa4EventsCsv] = useState<File | null>(null);
  const [gscQueriesCsv, setGscQueriesCsv] = useState<File | null>(null);
  const [gscPagesCsv, setGscPagesCsv] = useState<File | null>(null);

  // Step 7
  const [aov, setAov] = useState<number | ''>(settings.revenueDefaults.aov);
  const [conversionRate, setConversionRate] = useState<number | ''>(
    settings.revenueDefaults.conversionRate * 100
  );

  function addService() {
    const v = serviceInput.trim();
    if (!v) return;
    setServices((prev) => [...prev, v]);
    setServiceInput('');
  }

  function addCompetitor() {
    const url = competitorUrl.trim();
    if (!url) return;
    const label = competitorLabel.trim() || hostnameOf(url);
    setCompetitors((prev) => [...prev, { url, label }]);
    setCompetitorUrl('');
    setCompetitorLabel('');
  }

  function seedMapPackQueries() {
    if (!clientLocation || services.length === 0) {
      alert('Add at least one service and a location in Step 1 first.');
      return;
    }
    const [city] = clientLocation.split(',').map((s) => s.trim());
    const seed: MapPackQuery[] = [];
    for (const tpl of settings.defaultMapPackTemplates) {
      const service = services[0];
      const q = tpl.replace('{service}', service).replace('{city}', city || '').replace('{state}', '');
      seed.push({ query: q.trim().replace(/\s+/g, ' '), queryType: 'seeded' });
    }
    setMapPackQueries((prev) => [...prev, ...seed]);
  }

  function addQuery() {
    const v = queryInput.trim();
    if (!v) return;
    setMapPackQueries((prev) => [...prev, { query: v }]);
    setQueryInput('');
  }

  function setMatrixCell(query: string, key: string, value: MapPackPosition) {
    setMapPackResults((prev) => {
      const row = prev[query] || ({ client: null } as MapPackResults[string]);
      return { ...prev, [query]: { ...row, [key]: value } };
    });
  }

  async function saveDraft(advanceToStep?: number): Promise<string | null> {
    setCreating(true);
    try {
      const payload: Partial<Audit> = {
        ...(auditId ? { id: auditId } : {}),
        client: {
          name: clientName,
          url: clientUrl,
          location: clientLocation,
          services,
          brandAccentColor,
        },
        competitors,
        mapPackQueries,
        mapPackResults,
        revenueInputs: {
          aov: typeof aov === 'number' ? aov : undefined,
          conversionRate: typeof conversionRate === 'number' ? conversionRate / 100 : undefined,
        },
      };
      const res = await fetch('/api/audits' + (auditId ? `/${auditId}` : ''), {
        method: auditId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to save');
        return null;
      }
      const id: string | null = json.audit?.id || auditId;
      if (id && !auditId) setAuditId(id);
      if (advanceToStep) setStep(advanceToStep);
      return id;
    } catch (err) {
      alert((err as Error).message);
      return null;
    } finally {
      setCreating(false);
    }
  }

  async function uploadFiles(id: string) {
    const fd = new FormData();
    if (logoFile) fd.append('logo', logoFile);
    if (keywordsClientCsv) fd.append('keywordsClientCsv', keywordsClientCsv);
    keywordsCompetitorCsvs.forEach((f) => fd.append('keywordsCompetitorCsvs', f));
    if (backlinksCsv) fd.append('backlinksCsv', backlinksCsv);
    localDominatorScreenshots.forEach((f) => fd.append('localDominatorScreenshots', f));
    if (ga4TrafficCsv) fd.append('ga4TrafficCsv', ga4TrafficCsv);
    if (ga4EventsCsv) fd.append('ga4EventsCsv', ga4EventsCsv);
    if (gscQueriesCsv) fd.append('gscQueriesCsv', gscQueriesCsv);
    if (gscPagesCsv) fd.append('gscPagesCsv', gscPagesCsv);

    if (!Array.from(fd.keys()).length) return;
    const res = await fetch(`/api/audits/${id}/upload`, { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Upload failed');
  }

  async function handleFinishAndGenerate() {
    setCreating(true);
    try {
      const id = await saveDraft();
      if (!id) {
        alert('Could not create audit draft.');
        return;
      }
      await uploadFiles(id);
      const res = await fetch(`/api/audits/${id}/generate`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to start generation');
        return;
      }
      router.push(`/audits/${id}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Stepper currentStep={step} />

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Client basics</h2>
            <Field label="Business name">
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="BraceLab"
                className="input"
              />
            </Field>
            <Field label="Website URL">
              <input
                value={clientUrl}
                onChange={(e) => setClientUrl(e.target.value)}
                placeholder="https://bracelab.com/"
                className="input"
              />
            </Field>
            <Field label="Primary location / service area">
              <input
                value={clientLocation}
                onChange={(e) => setClientLocation(e.target.value)}
                placeholder="Buffalo, NY"
                className="input"
              />
            </Field>
            <Field label="Services">
              <div className="flex gap-2">
                <input
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                  placeholder="Add a service and press Enter"
                  className="input"
                />
                <button
                  type="button"
                  onClick={addService}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                >
                  <Plus size={14} />
                </button>
              </div>
              {services.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {services.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs"
                    >
                      {s}
                      <button
                        onClick={() => setServices((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-red-600"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Logo (PNG)">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              {logoFile && (
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                  <ImageIcon size={12} /> {logoFile.name}
                </p>
              )}
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Brand accent color</h2>
            <p className="text-sm text-slate-600">
              The audit PDF defaults to red (<code>#dc2626</code>) for accent elements. If
              the client&apos;s brand strongly favors a different color, swap it here.
              Primary navy (<code>#0f2746</code>) is preserved.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandAccentColor}
                onChange={(e) => setBrandAccentColor(e.target.value)}
                className="h-10 w-16 rounded border border-slate-300"
              />
              <input
                value={brandAccentColor}
                onChange={(e) => setBrandAccentColor(e.target.value)}
                className="input max-w-xs"
              />
              <div
                className="h-10 px-4 rounded text-white font-semibold text-sm flex items-center"
                style={{ background: brandAccentColor }}
              >
                Preview accent
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Competitors</h2>
            <p className="text-sm text-slate-600">Add 3–5 direct competitors.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                placeholder="https://competitor.com/"
                className="input md:col-span-2"
              />
              <input
                value={competitorLabel}
                onChange={(e) => setCompetitorLabel(e.target.value)}
                placeholder="Display label (optional)"
                className="input"
              />
            </div>
            <button
              type="button"
              onClick={addCompetitor}
              className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-700"
            >
              <Plus size={14} className="inline mr-1" /> Add competitor
            </button>
            {competitors.length > 0 && (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {competitors.map((c, i) => (
                  <li key={i} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <span className="font-medium text-slate-900">{c.label}</span>
                      <span className="text-slate-500 ml-2">{c.url}</span>
                    </div>
                    <button
                      onClick={() => setCompetitors((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Map Pack queries</h2>
            <p className="text-sm text-slate-600">
              At least 10 local search queries to track. Use the seeder, then edit.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={seedMapPackQueries}
                className="text-sm bg-[#16a34a] text-white px-3 py-1.5 rounded-md hover:bg-[#15803d]"
              >
                Seed from defaults
              </button>
              <span className="text-xs text-slate-500">
                Uses Step 1 services + location + Settings templates.
              </span>
            </div>
            <div className="flex gap-2">
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuery())}
                placeholder="Add a query and press Enter"
                className="input"
              />
              <button
                type="button"
                onClick={addQuery}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
              >
                <Plus size={14} />
              </button>
            </div>
            {mapPackQueries.length > 0 && (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md max-h-80 overflow-auto">
                {mapPackQueries.map((q, i) => (
                  <li key={i} className="flex items-center justify-between p-2 text-sm">
                    <span>{q.query}</span>
                    <button
                      onClick={() =>
                        setMapPackQueries((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Map Pack matrix</h2>
            <p className="text-sm text-slate-600">
              Manually enter your client&apos;s position and each competitor&apos;s position
              for every query. Click a cell, then choose 1, 2, 3, 4–10, or NR.
            </p>
            {mapPackQueries.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                Add some Map Pack queries in Step 4 first.
              </p>
            ) : (
              <div className="overflow-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#0f2746] text-white">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Query</th>
                      <th className="px-2 py-2 font-semibold">You</th>
                      {competitors.map((c, i) => (
                        <th key={i} className="px-2 py-2 font-semibold whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapPackQueries.map((q, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{q.query}</td>
                        <td className="px-2 py-2 text-center">
                          <PositionPicker
                            value={mapPackResults[q.query]?.client ?? null}
                            onChange={(v) => setMatrixCell(q.query, 'client', v)}
                          />
                        </td>
                        {competitors.map((c, ci) => (
                          <td key={ci} className="px-2 py-2 text-center">
                            <PositionPicker
                              value={
                                (mapPackResults[q.query]?.[c.url] as MapPackPosition) ?? null
                              }
                              onChange={(v) => setMatrixCell(q.query, c.url, v)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Tip: in Step 6 you can also upload Local Dominator screenshots. The audit
              engine will combine both.
            </p>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Uploads</h2>
            <p className="text-sm text-slate-600">
              All optional, but more data = deeper audit. CSVs from Semrush, GA4, GSC.
              Screenshots from Local Dominator if no API access.
            </p>
            <FileField label="Client keyword positions CSV (Semrush)" value={keywordsClientCsv} onChange={setKeywordsClientCsv} accept=".csv" />
            <FileField label="Competitor keyword CSVs (one per competitor)" multipleFiles={keywordsCompetitorCsvs} onChangeMultiple={setKeywordsCompetitorCsvs} accept=".csv" multiple />
            <FileField label="Backlinks CSV (Semrush)" value={backlinksCsv} onChange={setBacklinksCsv} accept=".csv" />
            <FileField label="Local Dominator screenshots (PNG/JPG)" multipleFiles={localDominatorScreenshots} onChangeMultiple={setLocalDominatorScreenshots} accept="image/*" multiple />
            <hr className="border-slate-200" />
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-700">GA4 + GSC</p>
              <span className="text-[10px] uppercase tracking-wide font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Optional</span>
            </div>
            <p className="text-xs text-slate-500 -mt-1">
              Skip if you don&apos;t have GA4/GSC access yet. When omitted, the audit renders cleanly with 8 sections instead of 9 (Section 8 — GSC + GA4 Trend Analysis — is removed entirely, and Advanced Executive Summary becomes Section 8).
            </p>
            <FileField label="GA4 traffic acquisition CSV" value={ga4TrafficCsv} onChange={setGa4TrafficCsv} accept=".csv" />
            <FileField label="GA4 events CSV" value={ga4EventsCsv} onChange={setGa4EventsCsv} accept=".csv" />
            <FileField label="GSC queries CSV" value={gscQueriesCsv} onChange={setGscQueriesCsv} accept=".csv" />
            <FileField label="GSC pages CSV" value={gscPagesCsv} onChange={setGscPagesCsv} accept=".csv" />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Revenue inputs</h2>
            <p className="text-sm text-slate-600">
              Used for the Revenue Opportunity page math. Defaults from Settings.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Average Order Value (USD)">
                <input
                  type="number"
                  value={aov}
                  onChange={(e) => setAov(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input"
                />
              </Field>
              <Field label="Conversion rate (%)">
                <input
                  type="number"
                  step="0.1"
                  value={conversionRate}
                  onChange={(e) =>
                    setConversionRate(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="input"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Review &amp; generate</h2>
            <ul className="text-sm text-slate-700 space-y-1">
              <li><strong>Client:</strong> {clientName} — {clientUrl}</li>
              <li><strong>Location:</strong> {clientLocation}</li>
              <li><strong>Services:</strong> {services.join(', ') || '—'}</li>
              <li><strong>Brand accent:</strong> <span style={{ color: brandAccentColor }}>{brandAccentColor}</span></li>
              <li><strong>Competitors:</strong> {competitors.length}</li>
              <li><strong>Map Pack queries:</strong> {mapPackQueries.length}</li>
              <li><strong>Matrix cells filled:</strong> {Object.values(mapPackResults).reduce((acc, row) => acc + Object.values(row).filter((v) => v !== null && v !== undefined).length, 0)}</li>
              <li><strong>AOV / conversion:</strong> ${aov || '—'} · {conversionRate || '—'}%</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900">
              Click <strong>Generate audit</strong> below to upload all files, dispatch the
              generation pipeline (Lighthouse via PSI, Claude narrative, Map Pack matrix,
              Competitor Comparison Dashboard, render HTML). Typical run time 2–5 minutes.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 disabled:opacity-40 text-sm font-medium"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => saveDraft()}
              disabled={creating}
              className="text-sm bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              {creating ? 'Saving...' : 'Save draft'}
            </button>
            {step < STEPS.length ? (
              <button
                type="button"
                onClick={() => saveDraft(step + 1)}
                disabled={creating}
                className="inline-flex items-center gap-1 bg-[#0f2746] text-white px-4 py-2 rounded-md hover:bg-[#12244a] disabled:opacity-50 text-sm font-medium"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishAndGenerate}
                disabled={creating}
                className="inline-flex items-center gap-1 bg-[#16a34a] text-white px-4 py-2 rounded-md hover:bg-[#15803d] disabled:opacity-50 text-sm font-medium"
              >
                <Upload size={14} />
                {creating ? 'Generating...' : 'Generate audit'}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          font-size: 0.875rem;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: white;
        }
        .input:focus {
          outline: none;
          box-shadow: 0 0 0 2px #0f2746;
          border-color: transparent;
        }
      `}</style>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEPS.map((s) => {
        const isActive = s.id === currentStep;
        const isDone = s.id < currentStep;
        return (
          <li
            key={s.id}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${
              isActive
                ? 'bg-[#0f2746] text-white font-semibold'
                : isDone
                ? 'bg-green-50 text-green-700 font-medium'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive
                  ? 'bg-white text-[#0f2746]'
                  : isDone
                  ? 'bg-[#16a34a] text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {isDone ? <Check size={10} /> : s.id}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const POS_OPTIONS: { value: MapPackPosition; label: string }[] = [
  { value: null, label: '—' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 'top10', label: '4–10' },
  { value: 'nr', label: 'NR' },
];

function PositionPicker({
  value,
  onChange,
}: {
  value: MapPackPosition;
  onChange: (v: MapPackPosition) => void;
}) {
  const cellClass =
    value === 1 || value === 2 || value === 3
      ? 'mp-cell mp-cell-1'
      : value === 'top10'
      ? 'mp-cell mp-cell-top10'
      : value === 'nr'
      ? 'mp-cell mp-cell-nr'
      : 'mp-cell mp-cell-empty';
  return (
    <select
      value={value === null ? '' : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '') onChange(null);
        else if (v === 'top10' || v === 'nr') onChange(v);
        else onChange(Number(v) as MapPackPosition);
      }}
      className={`${cellClass} cursor-pointer text-center bg-transparent`}
      style={{ minWidth: 64 }}
    >
      {POS_OPTIONS.map((opt) => (
        <option key={String(opt.value)} value={opt.value === null ? '' : String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function FileField({
  label,
  value,
  onChange,
  multipleFiles,
  onChangeMultiple,
  accept,
  multiple,
}: {
  label: string;
  value?: File | null;
  onChange?: (f: File | null) => void;
  multipleFiles?: File[];
  onChangeMultiple?: (f: File[]) => void;
  accept?: string;
  multiple?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          if (multiple && onChangeMultiple) {
            onChangeMultiple(Array.from(e.target.files || []));
          } else if (onChange) {
            onChange(e.target.files?.[0] || null);
          }
        }}
        className="text-sm"
      />
      {value && (
        <p className="text-xs text-green-700 mt-1">{value.name} ({(value.size / 1024).toFixed(0)} KB)</p>
      )}
      {multipleFiles && multipleFiles.length > 0 && (
        <p className="text-xs text-green-700 mt-1">{multipleFiles.length} files selected</p>
      )}
    </div>
  );
}
