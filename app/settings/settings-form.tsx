'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { AppSettings } from '@/lib/types';

interface Props {
  initial: AppSettings;
}

export function SettingsForm({ initial }: Props) {
  const [settings, setSettings] = useState<AppSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save');
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Makarios brand">
        <Field label="Company name">
          <input
            value={settings.makariosBrand.name}
            onChange={(e) =>
              setSettings({ ...settings, makariosBrand: { ...settings.makariosBrand, name: e.target.value } })
            }
            className="input"
          />
        </Field>
        <Field label="Website">
          <input
            value={settings.makariosBrand.website}
            onChange={(e) =>
              setSettings({ ...settings, makariosBrand: { ...settings.makariosBrand, website: e.target.value } })
            }
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input
              value={settings.makariosBrand.phone}
              onChange={(e) =>
                setSettings({ ...settings, makariosBrand: { ...settings.makariosBrand, phone: e.target.value } })
              }
              className="input"
            />
          </Field>
          <Field label="Email">
            <input
              value={settings.makariosBrand.email}
              onChange={(e) =>
                setSettings({ ...settings, makariosBrand: { ...settings.makariosBrand, email: e.target.value } })
              }
              className="input"
            />
          </Field>
        </div>
        <Field label="Address">
          <input
            value={settings.makariosBrand.address}
            onChange={(e) =>
              setSettings({ ...settings, makariosBrand: { ...settings.makariosBrand, address: e.target.value } })
            }
            className="input"
          />
        </Field>
      </Card>

      <Card title="Map Pack defaults">
        <p className="text-xs text-slate-500 mb-2">
          Templates seeded into new audits. Use <code>{'{service}'}</code>, <code>{'{city}'}</code>, <code>{'{state}'}</code> placeholders.
        </p>
        <textarea
          value={settings.defaultMapPackTemplates.join('\n')}
          onChange={(e) =>
            setSettings({
              ...settings,
              defaultMapPackTemplates: e.target.value.split('\n').filter(Boolean),
            })
          }
          rows={10}
          className="input font-mono"
        />
      </Card>

      <Card title="Revenue assumptions (defaults)">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Default AOV (USD)">
            <input
              type="number"
              value={settings.revenueDefaults.aov}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  revenueDefaults: { ...settings.revenueDefaults, aov: Number(e.target.value) },
                })
              }
              className="input"
            />
          </Field>
          <Field label="Default conversion rate (%)">
            <input
              type="number"
              step="0.1"
              value={settings.revenueDefaults.conversionRate * 100}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  revenueDefaults: {
                    ...settings.revenueDefaults,
                    conversionRate: Number(e.target.value) / 100,
                  },
                })
              }
              className="input"
            />
          </Field>
          <Field label="Top-3 CTR (%)">
            <input
              type="number"
              step="0.1"
              value={settings.revenueDefaults.topThreeCtr * 100}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  revenueDefaults: {
                    ...settings.revenueDefaults,
                    topThreeCtr: Number(e.target.value) / 100,
                  },
                })
              }
              className="input"
            />
          </Field>
          <Field label="Page-1 CTR (4–10) (%)">
            <input
              type="number"
              step="0.1"
              value={settings.revenueDefaults.pageOneCtr * 100}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  revenueDefaults: {
                    ...settings.revenueDefaults,
                    pageOneCtr: Number(e.target.value) / 100,
                  },
                })
              }
              className="input"
            />
          </Field>
        </div>
      </Card>

      <Card title="Local Dominator integration">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.localDominatorApiEnabled}
            onChange={(e) => setSettings({ ...settings, localDominatorApiEnabled: e.target.checked })}
          />
          Use Local Dominator API (requires <code>LOCAL_DOMINATOR_API_KEY</code> env var)
        </label>
        <p className="text-xs text-slate-500 mt-1">
          When disabled, the wizard will only accept Local Dominator screenshot uploads.
          When enabled, the audit pipeline will pull Map Pack data via the API.
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#0f2746] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#12244a] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
        {savedAt && (
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <Check size={14} />
            Saved at {savedAt}
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
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
      `}</style>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
